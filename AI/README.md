# Pitakado AI Inference Service

FastAPI service untuk membuka model `seq2seq_sales_forecast.keras` agar bisa diakses backend/fullstack.

## Setup

Ubuntu 24.04 memakai PEP 668, jadi jangan install dependency project ke Python system. Gunakan virtual environment:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

Opsional, aktifkan API key:

```bash
export AI_API_KEY="isi-secret-key"
```

Jika `AI_API_KEY` di-set, semua endpoint `/api/v1/model/*` wajib memakai header:

```http
X-API-Key: isi-secret-key
```

## Run

```bash
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Swagger UI:

```text
http://localhost:8000/docs
```

## Endpoint

- `GET /health`
- `GET /api/v1/model/info`
- `POST /api/v1/model/predict`
- `POST /api/v1/model/summary`
- `POST /api/v1/model/chat`

## Contoh Request Predict

Model di notebook dilatih dengan `look_back_days=14` dan `forecast_horizon_days=7`. Backend boleh mengirim histori lebih panjang, API akan memakai 14 hari terakhir agar cocok dengan input model.

```json
{
  "request_config": {
    "forecast_horizon_days": 7,
    "confidence_interval": 0.95
  },
  "items": [
    {
      "item_id": "bouquet pocky",
      "static_features": {
        "current_stock": 12
      },
      "historical_sequence": [
        {"date": "2026-04-01", "sales_qty": 2, "is_holiday": false, "has_promo": false},
        {"date": "2026-04-02", "sales_qty": 1, "is_holiday": false, "has_promo": false},
        {"date": "2026-04-03", "sales_qty": 0, "is_holiday": false, "has_promo": false},
        {"date": "2026-04-04", "sales_qty": 3, "is_holiday": false, "has_promo": true},
        {"date": "2026-04-05", "sales_qty": 1, "is_holiday": false, "has_promo": false},
        {"date": "2026-04-06", "sales_qty": 0, "is_holiday": false, "has_promo": false},
        {"date": "2026-04-07", "sales_qty": 1, "is_holiday": false, "has_promo": false},
        {"date": "2026-04-08", "sales_qty": 2, "is_holiday": false, "has_promo": false},
        {"date": "2026-04-09", "sales_qty": 1, "is_holiday": false, "has_promo": false},
        {"date": "2026-04-10", "sales_qty": 0, "is_holiday": false, "has_promo": false},
        {"date": "2026-04-11", "sales_qty": 2, "is_holiday": false, "has_promo": false},
        {"date": "2026-04-12", "sales_qty": 1, "is_holiday": false, "has_promo": true},
        {"date": "2026-04-13", "sales_qty": 0, "is_holiday": false, "has_promo": false},
        {"date": "2026-04-14", "sales_qty": 3, "is_holiday": false, "has_promo": false}
      ],
      "known_future_events": [
        {
          "date": "2026-04-17",
          "event_name": "Promo Weekend",
          "is_holiday": false,
          "has_promo": true,
          "impact": "HIGH"
        }
      ]
    }
  ]
}
```

## Output Predict

`POST /api/v1/model/predict` mengembalikan dua jenis hasil:

- `data.predictions[].daily_forecasts`: prediksi jumlah produk terjual per hari.
- `data.predictions[].material_requirements`: kebutuhan bahan baku untuk satu produk/SKU tersebut.
- `data.material_requirements`: total kebutuhan semua bahan dari seluruh produk/SKU yang dikirim.

Alur hitungnya:

```text
prediksi total produk terjual x komposisi bahan per produk = total kebutuhan bahan baku
```

Contoh ringkas output bahan:

```json
{
  "data": {
    "material_requirements": [
      {
        "material_name": "Kertas Bouquet",
        "quantity": 44,
        "raw_quantity": 44.0
      },
      {
        "material_name": "Gabus",
        "quantity": 3,
        "raw_quantity": 2.75
      }
    ]
  }
}
```

`quantity` dibulatkan ke atas karena bahan fisik perlu disiapkan dalam jumlah utuh. `raw_quantity` tetap disediakan untuk kebutuhan audit/perhitungan.

## Catatan Integrasi

Model memprediksi demand produk berbasis deret penjualan, lalu API mengalikan demand tersebut dengan komposisi bahan baku dari `data_static_qty_normalized.csv` yang sudah didenormalisasi memakai `min_max_dataset_full.csv`.
