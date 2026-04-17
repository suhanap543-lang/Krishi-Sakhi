"""
Plant Disease Detection — FastAPI Server
==========================================
Wraps the trained ResNet34 CNN model for HTTP access.
The Node.js backend calls this service to get disease predictions.

Usage:
  python disease_api.py          # starts on port 5050
"""

import os
import sys
import base64
import tempfile
import re

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Import from our prediction module
from plant_disease_predict import (
    load_model,
    predict_image,
    get_default_device,
    DISEASE_CLASSES,
)

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
app = FastAPI(title="Plant Disease Detection API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Load model once at startup
# ---------------------------------------------------------------------------
DEVICE = get_default_device()
MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "plantDisease-resnet34.pth")

MODEL = None
MODEL_LOADED = False

try:
    print(f"Loading CNN model from: {MODEL_PATH}")
    print(f"Using device: {DEVICE}")
    MODEL = load_model(MODEL_PATH, DEVICE)
    MODEL_LOADED = True
    print(f"✅ CNN Model loaded successfully! {len(DISEASE_CLASSES)} disease classes ready.")
except Exception as e:
    print(f"❌ Failed to load CNN model: {e}")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def parse_class_name(class_name: str):
    """
    Parse 'Tomato___Early_blight' into plant='Tomato', disease='Early blight'.
    For healthy classes like 'Tomato___healthy', disease will be 'healthy'.
    """
    parts = class_name.split("___")
    if len(parts) == 2:
        plant = parts[0].replace("_", " ").replace(",", ", ")
        disease = parts[1].replace("_", " ").strip()
        # Clean up extra spaces
        plant = re.sub(r"\s+", " ", plant).strip()
        disease = re.sub(r"\s+", " ", disease).strip()
        return plant, disease
    return class_name, "Unknown"


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class PredictRequest(BaseModel):
    image_base64: str  # base64-encoded image data (without data:image/... prefix)
    top_k: int = 3


class PredictionItem(BaseModel):
    class_name: str       # raw class e.g. "Tomato___Early_blight"
    plant_name: str       # parsed plant e.g. "Tomato"
    disease_name: str     # parsed disease e.g. "Early blight"
    confidence: float     # 0.0 - 1.0
    is_healthy: bool      # whether this is a "healthy" class


class PredictResponse(BaseModel):
    success: bool
    predictions: list[PredictionItem]
    top_prediction: PredictionItem | None = None


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": MODEL_LOADED, "device": str(DEVICE)}


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    if not MODEL_LOADED or MODEL is None:
        raise HTTPException(status_code=503, detail="CNN model is not loaded")

    # Decode base64 image to a temp file
    try:
        image_data = base64.b64decode(req.image_base64)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid base64 image: {e}")

    # Write to temp file for PIL processing
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
            tmp.write(image_data)
            tmp_path = tmp.name

        # Run prediction
        results = predict_image(tmp_path, MODEL, DEVICE, top_k=req.top_k)

        predictions = []
        for class_name, confidence in results:
            plant, disease = parse_class_name(class_name)
            predictions.append(PredictionItem(
                class_name=class_name,
                plant_name=plant,
                disease_name=disease,
                confidence=round(confidence, 4),
                is_healthy=disease.lower() == "healthy",
            ))

        return PredictResponse(
            success=True,
            predictions=predictions,
            top_prediction=predictions[0] if predictions else None,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {e}")
    finally:
        # Clean up temp file
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except:
                pass


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    print("🚀 Starting Plant Disease Detection API on port 5050...")
    uvicorn.run(app, host="0.0.0.0", port=5050)
