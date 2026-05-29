from __future__ import annotations

import csv
import math
import os
from datetime import date, datetime, timedelta, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

MODEL_PATH = BASE_DIR / "seq2seq_sales_forecast.keras"
SALES_DATA_PATH = BASE_DIR / "ringkasan_penjualan_harian.csv"
STATIC_QTY_PATH = BASE_DIR / "data_static_qty_normalized.csv"
MIN_MAX_PATH = BASE_DIR / "min_max_dataset_full.csv"
MODEL_VERSION = "GRU-RNN-v1.0-2026"
MODEL_NAME = "GRU-Sales-Forecast"
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
LOOK_BACK_DAYS = 14
FORECAST_HORIZON_DAYS = 7


app = FastAPI(
    title="Pitakado AI Inference Service",
    version="1.0.0",
    description="FastAPI service for Pitakado GRU sales forecasting integration.",
)

allowed_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RequestConfig(BaseModel):
    forecast_horizon_days: int = Field(default=FORECAST_HORIZON_DAYS, ge=1, le=FORECAST_HORIZON_DAYS)
    confidence_interval: float = Field(default=0.95, ge=0.0, le=1.0)


class HistoricalPoint(BaseModel):
    date: date
    sales_qty: int = Field(ge=0)
    is_holiday: bool = False
    has_promo: bool = False


class FutureEvent(BaseModel):
    date: date
    event_name: str | None = None
    is_holiday: bool = False
    has_promo: bool = False
    impact: str | None = None


class PredictionItem(BaseModel):
    item_id: str
    static_features: dict[str, Any] = Field(default_factory=dict)
    historical_sequence: list[HistoricalPoint] = Field(default_factory=list)
    known_future_events: list[FutureEvent] = Field(default_factory=list)

    @field_validator("historical_sequence")
    @classmethod
    def validate_history(cls, value: list[HistoricalPoint]) -> list[HistoricalPoint]:
        return sorted(value, key=lambda point: point.date)


class PredictRequest(BaseModel):
    request_config: RequestConfig = Field(default_factory=RequestConfig)
    items: list[PredictionItem] = Field(default_factory=list)


class SummaryRequest(BaseModel):
    item_id: str
    prediction_data: dict[str, Any]
    language: str = "id"


class ExplainRequest(BaseModel):
    prediction_data: dict[str, Any]
    language: str = "id"


class ChatRequest(BaseModel):
    session_id: str
    query: str
    context_id: str | None = None
    enable_rag: bool = False


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


async def verify_api_key(x_api_key: str | None = Header(default=None)) -> None:
    expected_key = os.getenv("AI_API_KEY")
    if expected_key and x_api_key != expected_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-API-Key header",
        )


@lru_cache(maxsize=1)
def get_training_sales_stats() -> tuple[float, float]:
    if not SALES_DATA_PATH.exists():
        return 0.0, 1.0

    totals: list[float] = []
    with SALES_DATA_PATH.open(newline="", encoding="utf-8") as file:
        reader = csv.DictReader(file)
        for row in reader:
            total = 0.0
            for key, value in row.items():
                if key in {"tanggal", "is_event"}:
                    continue
                total += float(value or 0)
            totals.append(total)

    if not totals:
        return 0.0, 1.0

    train_size = max(1, int(len(totals) * 0.8))
    train_values = totals[:train_size]
    mean = sum(train_values) / len(train_values)
    variance = sum((value - mean) ** 2 for value in train_values) / len(train_values)
    std = math.sqrt(variance) or 1.0
    return mean, std


@lru_cache(maxsize=1)
def get_material_recipes() -> tuple[dict[str, dict[str, float]], list[str]]:
    if not STATIC_QTY_PATH.exists() or not MIN_MAX_PATH.exists():
        raise RuntimeError("File komposisi bahan baku tidak lengkap.")

    minmax: dict[str, dict[str, float]] = {}
    with MIN_MAX_PATH.open(newline="", encoding="utf-8") as file:
        reader = csv.DictReader(file)
        index_column = reader.fieldnames[0] if reader.fieldnames else ""
        for row in reader:
            row_name = row.pop(index_column)
            minmax[row_name] = {key: float(value or 0) for key, value in row.items()}

    with STATIC_QTY_PATH.open(newline="", encoding="utf-8") as file:
        reader = csv.DictReader(file)
        material_names = [name for name in (reader.fieldnames or []) if name != "Produk"]
        recipes: dict[str, dict[str, float]] = {}
        for row in reader:
            product_name = row["Produk"]
            recipes[product_name] = {}
            for material_name in material_names:
                normalized_qty = float(row[material_name] or 0)
                min_value = minmax.get("MIN", {}).get(material_name, 0.0)
                max_value = minmax.get("MAX", {}).get(material_name, 1.0)
                recipes[product_name][material_name] = normalized_qty * (max_value - min_value) + min_value

    return recipes, material_names


@lru_cache(maxsize=1)
def get_model() -> Any:
    if not MODEL_PATH.exists():
        raise RuntimeError(f"Model file tidak ditemukan: {MODEL_PATH}")

    try:
        import tensorflow as tf
    except ModuleNotFoundError as exc:
        raise RuntimeError("TensorFlow belum ter-install. Jalankan: pip install -r requirements.txt") from exc

    return tf.keras.models.load_model(MODEL_PATH, compile=False)


def one_hot_day(day: date) -> list[float]:
    values = [0.0] * 7
    values[day.weekday()] = 1.0
    return values


def normalize_sales(value: float) -> float:
    mean, std = get_training_sales_stats()
    return (value - mean) / std


def denormalize_sales(value: float) -> float:
    mean, std = get_training_sales_stats()
    return (value * std) + mean


def future_dates_from_history(history: list[HistoricalPoint], horizon: int) -> list[date]:
    last_date = max(point.date for point in history)
    return [last_date + timedelta(days=offset) for offset in range(1, horizon + 1)]


def event_by_date(events: list[FutureEvent]) -> dict[date, FutureEvent]:
    return {event.date: event for event in events}


def build_model_inputs(item: PredictionItem, horizon: int) -> tuple[Any, Any, list[date]]:
    import numpy as np

    history = item.historical_sequence[-LOOK_BACK_DAYS:]
    encoder_rows = [
        [normalize_sales(point.sales_qty), *one_hot_day(point.date)]
        for point in history
    ]

    dates = future_dates_from_history(item.historical_sequence, horizon)
    events = event_by_date(item.known_future_events)
    decoder_rows = []
    for target_date in dates:
        event = events.get(target_date)
        has_event = bool(event and (event.is_holiday or event.has_promo or event.event_name))
        decoder_rows.append([1.0 if has_event else 0.0, *one_hot_day(target_date)])

    return (
        np.array([encoder_rows], dtype=np.float32),
        np.array([decoder_rows], dtype=np.float32),
        dates,
    )


def run_prediction(item: PredictionItem, horizon: int) -> tuple[list[int], list[date]]:
    model = get_model()
    encoder_input, decoder_input, dates = build_model_inputs(item, FORECAST_HORIZON_DAYS)
    prediction_scaled = model.predict([encoder_input, decoder_input], verbose=0)
    prediction_values = prediction_scaled.reshape(-1).tolist()[:horizon]
    predictions = [max(0, int(round(denormalize_sales(value)))) for value in prediction_values]
    return predictions, dates[:horizon]


def event_payload(target_date: date, events: dict[date, FutureEvent]) -> dict[str, str] | None:
    event = events.get(target_date)
    if not event:
        return None

    impact = (event.impact or ("HIGH" if event.is_holiday or event.has_promo else "NORMAL")).upper()
    return {
        "impact": impact,
        "event_name": event.event_name or ("Holiday/Promo" if impact == "HIGH" else "Regular Day"),
    }


def build_alert_and_recommendation(
    item: PredictionItem,
    dates: list[date],
    predictions: list[int],
) -> tuple[dict[str, Any], dict[str, Any]]:
    total_demand = sum(predictions)
    current_stock = int(item.static_features.get("current_stock", item.static_features.get("stock", 0)) or 0)

    running_demand = 0
    days_until_out = None
    for index, demand in enumerate(predictions, start=1):
        running_demand += demand
        if running_demand > current_stock:
            days_until_out = index
            break

    status_text = "CRITICAL" if current_stock < total_demand else "NORMAL"
    suggested_quantity = max(0, total_demand - current_stock)
    deadline = (dates[0] - timedelta(days=1)).isoformat() + "T23:59:59Z"

    return (
        {
            "status": status_text,
            "current_stock": current_stock,
            "days_until_out_of_stock": days_until_out,
        },
        {
            "action": "URGENT_RESTOCK" if suggested_quantity else "MONITOR_STOCK",
            "suggested_quantity": suggested_quantity,
            "deadline": deadline,
        },
    )


def product_name_for_recipe(item: PredictionItem) -> str:
    return str(item.static_features.get("product_name") or item.item_id)


def calculate_material_requirements(product_name: str, total_demand: int) -> tuple[list[dict[str, Any]], bool]:
    recipes, material_names = get_material_recipes()
    recipe = recipes.get(product_name)
    if recipe is None:
        return (
            [
                {
                    "material_name": material_name,
                    "quantity": 0,
                    "raw_quantity": 0.0,
                }
                for material_name in material_names
            ],
            False,
        )

    requirements = []
    for material_name in material_names:
        raw_quantity = recipe.get(material_name, 0.0) * total_demand
        requirements.append(
            {
                "material_name": material_name,
                "quantity": int(math.ceil(raw_quantity)),
                "raw_quantity": round(raw_quantity, 2),
            }
        )
    return requirements, True


def add_to_total_materials(total_materials: dict[str, float], material_requirements: list[dict[str, Any]]) -> None:
    for material in material_requirements:
        total_materials[material["material_name"]] = total_materials.get(material["material_name"], 0.0) + float(
            material["raw_quantity"]
        )


def format_total_materials(total_materials: dict[str, float]) -> list[dict[str, Any]]:
    if not total_materials:
        return []

    _, material_names = get_material_recipes()
    return [
        {
            "material_name": material_name,
            "quantity": int(math.ceil(total_materials.get(material_name, 0.0))),
            "raw_quantity": round(total_materials.get(material_name, 0.0), 2),
        }
        for material_name in material_names
    ]


def get_prediction_materials(prediction_data: dict[str, Any]) -> list[dict[str, Any]]:
    if "material_requirements" in prediction_data:
        return prediction_data.get("material_requirements", [])
    return prediction_data.get("data", {}).get("material_requirements", [])


def get_prediction_items(prediction_data: dict[str, Any]) -> list[dict[str, Any]]:
    if "predictions" in prediction_data:
        return prediction_data.get("predictions", [])
    return prediction_data.get("data", {}).get("predictions", [])


def top_materials_text(materials: list[dict[str, Any]], limit: int = 5) -> str:
    top_materials = sorted(materials, key=lambda material: material.get("quantity", 0), reverse=True)[:limit]
    if not top_materials:
        return "Tidak ada data kebutuhan bahan baku."
    return "\n".join(
        f"- {material.get('material_name')}: {material.get('quantity')} unit "
        f"(raw: {material.get('raw_quantity', material.get('quantity'))})"
        for material in top_materials
    )


def product_forecast_text(items: list[dict[str, Any]]) -> str:
    if not items:
        return "Tidak ada detail prediksi produk."
    lines = []
    for item in items:
        summary = item.get("forecast_summary", {})
        lines.append(
            f"- {item.get('product_name') or item.get('item_id')}: "
            f"{summary.get('total_estimated_demand', 0)} produk, "
            f"peak date {summary.get('peak_demand_date', '-')}, "
            f"alert {item.get('alert', {}).get('status', 'UNKNOWN')}"
        )
    return "\n".join(lines)


def build_explanation_prompt(prediction_data: dict[str, Any], language: str) -> str:
    materials = get_prediction_materials(prediction_data)
    items = get_prediction_items(prediction_data)
    events = prediction_data.get("data", {}).get("summary", {}).get("detected_upcoming_events", [])

    return f"""
Kamu adalah asisten bisnis untuk toko bouquet Pitakado.

Berdasarkan hasil prediksi penjualan produk dan kebutuhan bahan baku 7 hari ke depan berikut:

Prediksi produk:
{product_forecast_text(items)}

Kebutuhan bahan baku utama:
{top_materials_text(materials)}

Event terdeteksi:
{", ".join(events) if events else "-"}

Buatkan rekomendasi singkat dalam bahasa {language} yang mencakup:
1. prioritas pembelian bahan baku,
2. risiko kekurangan stok,
3. saran produksi,
4. saran strategi penjualan,
5. ringkasan keputusan untuk pemilik toko.

Jawaban maksimal 5 poin, langsung praktis, dan mudah dipahami pemilik UMKM.
""".strip()


def build_rule_based_explanation(prediction_data: dict[str, Any]) -> str:
    materials = get_prediction_materials(prediction_data)
    items = get_prediction_items(prediction_data)
    top_materials = sorted(materials, key=lambda material: material.get("quantity", 0), reverse=True)[:3]
    critical_items = [
        item.get("product_name") or item.get("item_id")
        for item in items
        if item.get("alert", {}).get("status") == "CRITICAL"
    ]
    material_text = ", ".join(
        f"{material.get('material_name')} {material.get('quantity')} unit" for material in top_materials
    )
    critical_text = ", ".join(critical_items) if critical_items else "tidak ada produk critical"

    return (
        f"1. Prioritaskan pembelian bahan terbesar: {material_text or 'belum tersedia'}.\n"
        f"2. Risiko stok perlu diawasi pada: {critical_text}.\n"
        "3. Produksi sebaiknya fokus pada produk dengan prediksi demand tertinggi dan peak date terdekat.\n"
        "4. Strategi penjualan: siapkan promo hanya jika bahan utama aman, agar tidak memicu kekurangan stok.\n"
        "5. Keputusan: lakukan restock bahan prioritas sebelum periode prediksi dimulai."
    )


def generate_gemini_explanation(prediction_data: dict[str, Any], language: str) -> tuple[str, str]:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return build_rule_based_explanation(prediction_data), "Rule-Based-Summary-v1"

    try:
        from google import genai
    except ModuleNotFoundError as exc:
        raise RuntimeError("Package google-genai belum ter-install. Jalankan: pip install -r requirements.txt") from exc

    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=build_explanation_prompt(prediction_data, language),
    )
    return response.text or build_rule_based_explanation(prediction_data), f"Gemini-{GEMINI_MODEL}"


@app.get("/api/v1/model/info", dependencies=[Depends(verify_api_key)])
def model_info() -> dict[str, Any]:
    return {
        "meta": {
            "timestamp": utc_now_iso(),
            "status": "success",
        },
        "data": {
            "model_name": MODEL_NAME,
            "version": MODEL_VERSION,
            "architecture": "Seq2Seq GRU, encoder sales history + day-of-week, decoder future event + day-of-week",
            "last_trained": "2026-04-14",
            "config": {
                "look_back_days": LOOK_BACK_DAYS,
                "forecast_horizon_days": FORECAST_HORIZON_DAYS,
            },
            "metrics": {
                "mae": None,
                "rmse": None,
            },
        },
    }


@app.post("/api/v1/model/predict", dependencies=[Depends(verify_api_key)])
def predict(payload: PredictRequest) -> dict[str, Any]:
    horizon = payload.request_config.forecast_horizon_days
    all_events = sorted(
        {
            event.event_name
            for item in payload.items
            for event in item.known_future_events
            if event.event_name
        }
    )
    response_predictions = []
    total_materials: dict[str, float] = {}
    unmatched_products = []
    skipped_items = []

    try:
        for item in payload.items:
            if len(item.historical_sequence) < LOOK_BACK_DAYS:
                skipped_items.append(
                    {
                        "item_id": item.item_id,
                        "reason": f"historical_sequence kurang dari {LOOK_BACK_DAYS} hari",
                        "received_days": len(item.historical_sequence),
                    }
                )
                continue

            predicted_demands, dates = run_prediction(item, horizon)
            total_estimated_demand = sum(predicted_demands)
            events = event_by_date(item.known_future_events)
            daily_forecasts = [
                {
                    "date": target_date.isoformat(),
                    "predicted_demand": demand,
                    "seasonal_event": event_payload(target_date, events),
                }
                for target_date, demand in zip(dates, predicted_demands)
            ]
            peak_index = max(range(len(predicted_demands)), key=predicted_demands.__getitem__)
            alert, recommendation = build_alert_and_recommendation(item, dates, predicted_demands)
            product_name = product_name_for_recipe(item)
            material_requirements, recipe_found = calculate_material_requirements(product_name, total_estimated_demand)
            if not recipe_found:
                unmatched_products.append(product_name)
            add_to_total_materials(total_materials, material_requirements)

            response_predictions.append(
                {
                    "item_id": item.item_id,
                    "product_name": product_name,
                    "forecast_summary": {
                        "total_estimated_demand": total_estimated_demand,
                        "peak_demand_date": dates[peak_index].isoformat(),
                    },
                    "daily_forecasts": daily_forecasts,
                    "material_requirements": material_requirements,
                    "alert": alert,
                    "recommendation": recommendation,
                }
            )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return {
        "meta": {
            "status": "success",
            "message": "Inference processed successfully",
            "model_version": MODEL_VERSION,
        },
        "data": {
            "summary": {
                "detected_upcoming_events": all_events,
                "unmatched_products": unmatched_products,
                "skipped_items": skipped_items,
            },
            "predictions": response_predictions,
            "material_requirements": format_total_materials(total_materials),
        },
    }


@app.post("/api/v1/model/explain", dependencies=[Depends(verify_api_key)])
def explain(payload: ExplainRequest) -> dict[str, Any]:
    try:
        explanation_text, generated_by = generate_gemini_explanation(payload.prediction_data, payload.language)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return {
        "meta": {
            "timestamp": utc_now_iso(),
            "status": "success",
        },
        "data": {
            "explanation_text": explanation_text,
            "generated_by": generated_by,
        },
    }


@app.post("/api/v1/model/summary", dependencies=[Depends(verify_api_key)])
def summarize(payload: SummaryRequest) -> dict[str, Any]:
    try:
        summary_text, generated_by = generate_gemini_explanation(payload.prediction_data, payload.language)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return {
        "meta": {
            "timestamp": utc_now_iso(),
            "status": "success",
        },
        "data": {
            "item_id": payload.item_id,
            "summary_text": summary_text,
            "generated_by": generated_by,
        },
    }


@app.post("/api/v1/model/chat", dependencies=[Depends(verify_api_key)])
def chat(payload: ChatRequest) -> dict[str, Any]:
    retrieved_sources = []
    if payload.enable_rag:
        retrieved_sources.append(
            {
                "title": "Local sales history and latest model inference context",
                "type": "local_context",
            }
        )

    return {
        "meta": {
            "timestamp": utc_now_iso(),
            "status": "success",
        },
        "data": {
            "session_id": payload.session_id,
            "reply": (
                "Layanan chat AI sudah aktif sebagai placeholder integrasi. "
                "Hubungkan Gemini/RAG untuk jawaban analitik yang memakai histori transaksi penuh."
            ),
            "retrieved_sources": retrieved_sources,
        },
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
