import warnings
warnings.filterwarnings("ignore", category=UserWarning, module="xgboost")
warnings.filterwarnings("ignore", category=UserWarning, module="sklearn")

import joblib
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field
from typing import List, Dict, Any, Optional
import os
import uvicorn

app = FastAPI(title="Crop Recommendation API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Load model artifacts on startup
# ---------------------------------------------------------------------------
BASE_DIR = os.path.dirname(__file__)
try:
    model = joblib.load(os.path.join(BASE_DIR, "crop_model.pkl"))
    label_encoder = joblib.load(os.path.join(BASE_DIR, "crop_encoder.pkl"))
    MODEL_LOADED = True
    print("✅ Model and encoder loaded successfully")
except FileNotFoundError as e:
    MODEL_LOADED = False
    print(f"⚠️  Model files not found: {e}")
except Exception as e:
    MODEL_LOADED = False
    print(f"❌ Failed to load model: {e}")


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class CropInput(BaseModel):
    N: float = Field(..., ge=0, le=140)
    P: float = Field(..., ge=0, le=145)
    K: float = Field(..., ge=0, le=205)
    temperature: float = Field(..., ge=0, le=55)
    humidity: float = Field(..., ge=0, le=100)
    ph: float = Field(..., ge=0, le=14)
    rainfall: float = Field(..., ge=0, le=300)

    city: Optional[str] = Field(default="Unknown")
    state: Optional[str] = Field(default="Unknown")
    country: Optional[str] = Field(default="India")
    lat: Optional[float] = Field(default=0.0)
    lon: Optional[float] = Field(default=0.0)
    weather_description: Optional[str] = Field(default="")
    soil_type: Optional[str] = Field(default="")


class CropOutput(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    recommended_crop: str
    confidence: float
    top3: List[Dict[str, Any]]
    model_context: Dict[str, Any]


# ---------------------------------------------------------------------------
# Fallback rule-based predictor
# ---------------------------------------------------------------------------
FALLBACK_RULES = [
    {
        "crop": "rice",
        "N": (60, 140),
        "P": (30, 60),
        "K": (30, 60),
        "ph": (5.5, 7.0),
        "rain": (150, 300),
    },
    {
        "crop": "wheat",
        "N": (60, 120),
        "P": (40, 80),
        "K": (40, 80),
        "ph": (6.0, 7.5),
        "rain": (50, 150),
    },
    {
        "crop": "maize",
        "N": (60, 120),
        "P": (30, 60),
        "K": (20, 50),
        "ph": (5.5, 7.5),
        "rain": (60, 200),
    },
    {
        "crop": "chickpea",
        "N": (0, 40),
        "P": (40, 100),
        "K": (20, 80),
        "ph": (6.0, 8.0),
        "rain": (30, 100),
    },
    {
        "crop": "cotton",
        "N": (80, 140),
        "P": (40, 60),
        "K": (40, 60),
        "ph": (5.5, 7.5),
        "rain": (50, 120),
    },
    {
        "crop": "sugarcane",
        "N": (100, 140),
        "P": (50, 100),
        "K": (50, 100),
        "ph": (6.0, 7.5),
        "rain": (150, 300),
    },
    {
        "crop": "mungbean",
        "N": (0, 40),
        "P": (20, 60),
        "K": (20, 60),
        "ph": (6.0, 7.5),
        "rain": (50, 100),
    },
    {
        "crop": "lentil",
        "N": (0, 40),
        "P": (40, 100),
        "K": (20, 60),
        "ph": (6.0, 7.5),
        "rain": (20, 80),
    },
    {
        "crop": "pomegranate",
        "N": (0, 40),
        "P": (10, 40),
        "K": (10, 40),
        "ph": (5.5, 7.0),
        "rain": (50, 150),
    },
    {
        "crop": "banana",
        "N": (80, 140),
        "P": (60, 120),
        "K": (100, 205),
        "ph": (5.5, 7.0),
        "rain": (50, 150),
    },
    {
        "crop": "grapes",
        "N": (0, 40),
        "P": (100, 145),
        "K": (100, 205),
        "ph": (5.5, 7.0),
        "rain": (50, 150),
    },
    {
        "crop": "mango",
        "N": (0, 40),
        "P": (15, 60),
        "K": (15, 60),
        "ph": (5.5, 7.5),
        "rain": (50, 200),
    },
]


def fallback_predict(data: CropInput) -> List[Dict[str, Any]]:
    scores = []
    for rule in FALLBACK_RULES:
        score = 0
        if rule["N"][0] <= data.N <= rule["N"][1]:
            score += 1
        if rule["P"][0] <= data.P <= rule["P"][1]:
            score += 1
        if rule["K"][0] <= data.K <= rule["K"][1]:
            score += 1
        if rule["ph"][0] <= data.ph <= rule["ph"][1]:
            score += 1
        if rule["rain"][0] <= data.rainfall <= rule["rain"][1]:
            score += 1
        scores.append({"crop": rule["crop"], "score": score})
    scores.sort(key=lambda x: x["score"], reverse=True)
    return [
        {"crop": s["crop"], "confidence": round(s["score"] / 5, 2)} for s in scores[:3]
    ]


def build_model_context(data: CropInput, top3: List[Dict[str, Any]]) -> Dict[str, Any]:
    return {
        "soil": {
            "nitrogen_kg_ha": data.N,
            "phosphorous_kg_ha": data.P,
            "potassium_kg_ha": data.K,
            "ph": data.ph,
            "type": data.soil_type,
        },
        "weather": {
            "temperature_c": data.temperature,
            "humidity_pct": data.humidity,
            "rainfall_mm": data.rainfall,
            "description": data.weather_description or "",
        },
        "location": {
            "city": data.city or "Unknown",
            "state": data.state or "Unknown",
            "country": data.country or "India",
            "lat": data.lat or 0.0,
            "lon": data.lon or 0.0,
        },
        "ml_recommendations": [
            {
                "rank": i + 1,
                "crop": c["crop"],
                "confidence": c["confidence"],
                "confidence_pct": f"{round(c['confidence'] * 100, 1)}%",
            }
            for i, c in enumerate(top3)
        ],
        "primary_crop": top3[0]["crop"],
        "primary_confidence": top3[0]["confidence"],
    }


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": MODEL_LOADED}


@app.post("/predict", response_model=CropOutput)
def predict_crop(data: CropInput):
    if not MODEL_LOADED:
        top3 = fallback_predict(data)
        return CropOutput(
            recommended_crop=top3[0]["crop"],
            confidence=top3[0]["confidence"],
            top3=top3,
            model_context=build_model_context(data, top3),
        )

    try:
        features = np.array(
            [
                [
                    data.N,
                    data.P,
                    data.K,
                    data.temperature,
                    data.humidity,
                    data.ph,
                    data.rainfall,
                ]
            ]
        )

        proba = model.predict_proba(features)[0]
        top3_idx = np.argsort(proba)[::-1][:3]
        top3 = [
            {
                "crop": str(label_encoder.inverse_transform([int(i)])[0]),
                "confidence": round(float(proba[i]), 4),
            }
            for i in top3_idx
        ]

        print(
            f"✅ Prediction: {top3[0]['crop']} ({round(top3[0]['confidence']*100,1)}%)"
        )

        return CropOutput(
            recommended_crop=top3[0]["crop"],
            confidence=top3[0]["confidence"],
            top3=top3,
            model_context=build_model_context(data, top3),
        )

    except Exception as e:
        print(f"❌ Prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    print("🚀 Starting Crop Recommendation API on port 8001...")
    uvicorn.run(app, host="0.0.0.0", port=8001)
