from __future__ import annotations

import csv
import math
import os
from datetime import date, datetime, timedelta, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException, status
from pydantic import BaseModel, Field, field_validator


BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "seq2seq_sales_forecast.keras"
SALES_DATA_PATH = BASE_DIR / "ringkasan_penjualan_harian.csv"
STATIC_QTY_PATH = BASE_DIR / "data_static_qty_normalized.csv"
MIN_MAX_PATH = BASE_DIR / "min_max_dataset_full.csv"
MODEL_VERSION = "GRU-RNN-v1.0-2026"
MODEL_NAME = "GRU-Sales-Forecast"
LOOK_BACK_DAYS = 14
FORECAST_HORIZON_DAYS = 7


app = FastAPI(
    title="Pitakado AI Inference Service",
    version="1.0.0",
    description="FastAPI service for Pitakado GRU sales forecasting integration.",
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
    historical_sequence: list[HistoricalPoint]
    known_future_events: list[FutureEvent] = Field(default_factory=list)

    @field_validator("historical_sequence")
    @classmethod
    def validate_history(cls, value: list[HistoricalPoint]) -> list[HistoricalPoint]:
        if len(value) < LOOK_BACK_DAYS:
            raise ValueError(f"historical_sequence minimal {LOOK_BACK_DAYS} hari")
        return sorted(value, key=lambda point: point.date)


class PredictRequest(BaseModel):
    request_config: RequestConfig = Field(default_factory=RequestConfig)
    items: list[PredictionItem]

    @field_validator("items")
    @classmethod
    def validate_items(cls, value: list[PredictionItem]) -> list[PredictionItem]:
        if not value:
            raise ValueError("items tidak boleh kosong")
        return value


class SummaryRequest(BaseModel):
    item_id: str
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
    _, material_names = get_material_recipes()
    return [
        {
            "material_name": material_name,
            "quantity": int(math.ceil(total_materials.get(material_name, 0.0))),
            "raw_quantity": round(total_materials.get(material_name, 0.0), 2),
        }
        for material_name in material_names
    ]


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

    try:
        for item in payload.items:
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
            },
            "predictions": response_predictions,
            "material_requirements": format_total_materials(total_materials),
        },
    }


@app.post("/api/v1/model/summary", dependencies=[Depends(verify_api_key)])
def summarize(payload: SummaryRequest) -> dict[str, Any]:
    prediction = payload.prediction_data
    alert = prediction.get("alert", {})
    recommendation = prediction.get("recommendation", {})
    forecast_summary = prediction.get("forecast_summary", {})
    materials = prediction.get("material_requirements", [])
    top_materials = sorted(materials, key=lambda material: material.get("quantity", 0), reverse=True)[:3]
    top_materials_text = ", ".join(
        f"{material.get('material_name')} {material.get('quantity')} unit" for material in top_materials
    )

    summary_text = (
        f"Prediksi untuk {payload.item_id} memperkirakan produk terjual "
        f"{forecast_summary.get('total_estimated_demand', 0)} unit dalam periode mendatang. "
        f"Kebutuhan bahan baku terbesar: {top_materials_text or 'belum tersedia'}. "
        f"Status stok saat ini {alert.get('status', 'UNKNOWN')} dengan stok tersedia "
        f"{alert.get('current_stock', 0)} unit. Rekomendasi sistem adalah "
        f"{recommendation.get('action', 'MONITOR_STOCK')} sebanyak "
        f"{recommendation.get('suggested_quantity', 0)} unit sebelum "
        f"{recommendation.get('deadline', '-') }."
    )

    return {
        "meta": {
            "timestamp": utc_now_iso(),
            "status": "success",
        },
        "data": {
            "item_id": payload.item_id,
            "summary_text": summary_text,
            "generated_by": "Rule-Based-Summary-v1",
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
