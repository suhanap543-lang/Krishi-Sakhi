"""
Plant Disease Identification — Standalone Prediction Script
============================================================
Loads the trained ResNet34 model (plantDisease-resnet34.pth) and predicts
the disease class from a plant leaf image.

Model architecture and preprocessing exactly match the training notebook:
  Plant Disease Identification.ipynb

Usage:
  python plant_disease_predict.py --check            # verify model loads OK
  python plant_disease_predict.py path/to/image.jpg  # predict disease
"""

import os
import sys
import argparse

import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.models as models
import torchvision.transforms as transforms
from PIL import Image

# ---------------------------------------------------------------------------
# 38 disease class names — alphabetical order matching ImageFolder sort
# (exactly as produced by the training dataset)
# ---------------------------------------------------------------------------
DISEASE_CLASSES = [
    "Apple___Apple_scab",
    "Apple___Black_rot",
    "Apple___Cedar_apple_rust",
    "Apple___healthy",
    "Blueberry___healthy",
    "Cherry_(including_sour)___Powdery_mildew",
    "Cherry_(including_sour)___healthy",
    "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot",
    "Corn_(maize)___Common_rust_",
    "Corn_(maize)___Northern_Leaf_Blight",
    "Corn_(maize)___healthy",
    "Grape___Black_rot",
    "Grape___Esca_(Black_Measles)",
    "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)",
    "Grape___healthy",
    "Orange___Haunglongbing_(Citrus_greening)",
    "Peach___Bacterial_spot",
    "Peach___healthy",
    "Pepper,_bell___Bacterial_spot",
    "Pepper,_bell___healthy",
    "Potato___Early_blight",
    "Potato___Late_blight",
    "Potato___healthy",
    "Raspberry___healthy",
    "Soybean___healthy",
    "Squash___Powdery_mildew",
    "Strawberry___Leaf_scorch",
    "Strawberry___healthy",
    "Tomato___Bacterial_spot",
    "Tomato___Early_blight",
    "Tomato___Late_blight",
    "Tomato___Leaf_Mold",
    "Tomato___Septoria_leaf_spot",
    "Tomato___Spider_mites Two-spotted_spider_mite",
    "Tomato___Target_Spot",
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus",
    "Tomato___Tomato_mosaic_virus",
    "Tomato___healthy",
]

assert len(DISEASE_CLASSES) == 38, f"Expected 38 classes, got {len(DISEASE_CLASSES)}"


# ---------------------------------------------------------------------------
# Base class (from notebook Cell 19)
# ---------------------------------------------------------------------------
def accuracy(outputs, labels):
    _, preds = torch.max(outputs, dim=1)
    return torch.tensor(torch.sum(preds == labels).item() / len(preds))


class ImageClassificationBase(nn.Module):
    def training_step(self, batch):
        images, labels = batch
        out = self(images)
        loss = F.cross_entropy(out, labels)
        return loss

    def validation_step(self, batch):
        images, labels = batch
        out = self(images)
        loss = F.cross_entropy(out, labels)
        acc = accuracy(out, labels)
        return {"val_loss": loss, "val_acc": acc}

    def validation_epoch_end(self, outputs):
        batch_loss = [out["val_loss"] for out in outputs]
        epoch_loss = torch.stack(batch_loss).mean()
        batch_acc = [out["val_acc"] for out in outputs]
        epoch_acc = torch.stack(batch_acc).mean()
        return {"val_loss": epoch_loss.item(), "val_acc": epoch_acc.item()}

    def epoch_end(self, epoch, result):
        print(
            "Epoch [{}], train_loss: {:.4f}, val_loss: {:.4f}, val_acc: {:.4f}".format(
                epoch, result["train_loss"], result["val_loss"], result["val_acc"]
            )
        )


# ---------------------------------------------------------------------------
# Model class (from notebook Cell 22) — uses ResNet34
# ---------------------------------------------------------------------------
class Plant_Disease_Model2(ImageClassificationBase):
    def __init__(self):
        super().__init__()
        # Use weights=None since we will load our own trained state_dict.
        # The original notebook used pretrained=True during TRAINING only.
        self.network = models.resnet34(weights=None)
        num_ftrs = self.network.fc.in_features  # 512
        self.network.fc = nn.Linear(num_ftrs, 38)

    def forward(self, xb):
        return self.network(xb)


# ---------------------------------------------------------------------------
# Image preprocessing — must match training (notebook Cell 9)
# ---------------------------------------------------------------------------
transform = transforms.Compose([
    transforms.Resize(128),
    transforms.ToTensor(),
])


# ---------------------------------------------------------------------------
# Helper: pick device
# ---------------------------------------------------------------------------
def get_default_device():
    """Pick GPU if available, else CPU"""
    if torch.cuda.is_available():
        return torch.device("cuda")
    else:
        return torch.device("cpu")


def to_device(data, device):
    """Move tensor(s) to chosen device"""
    if isinstance(data, (list, tuple)):
        return [to_device(x, device) for x in data]
    return data.to(device, non_blocking=True)


# ---------------------------------------------------------------------------
# Load model
# ---------------------------------------------------------------------------
def load_model(model_path: str, device: torch.device):
    """Instantiate Plant_Disease_Model2 and load trained weights."""
    model = Plant_Disease_Model2()

    state_dict = torch.load(model_path, map_location=device, weights_only=True)
    model.load_state_dict(state_dict)

    model = to_device(model, device)
    model.eval()
    return model


# ---------------------------------------------------------------------------
# Prediction (from notebook Cell 39 — enhanced with top-k)
# ---------------------------------------------------------------------------
@torch.no_grad()
def predict_image(image_path: str, model, device: torch.device, top_k: int = 3):
    """
    Load an image file, preprocess it, and return the predicted disease class
    with confidence scores.
    """
    img = Image.open(image_path).convert("RGB")
    img_tensor = transform(img)
    xb = to_device(img_tensor.unsqueeze(0), device)

    yb = model(xb)
    probs = F.softmax(yb, dim=1)
    top_probs, top_indices = torch.topk(probs, top_k, dim=1)

    results = []
    for i in range(top_k):
        idx = top_indices[0][i].item()
        conf = top_probs[0][i].item()
        results.append((DISEASE_CLASSES[idx], conf))

    return results


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(
        description="Plant Disease Identification using ResNet34"
    )
    parser.add_argument(
        "image",
        nargs="?",
        default=None,
        help="Path to a plant leaf image (jpg/png)",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Just verify the model loads successfully",
    )
    parser.add_argument(
        "--model",
        default=None,
        help="Path to the .pth model file (default: auto-detect in same dir)",
    )
    parser.add_argument(
        "--top-k",
        type=int,
        default=3,
        help="Number of top predictions to show (default: 3)",
    )
    args = parser.parse_args()

    # --- Resolve model path ---
    if args.model:
        model_path = args.model
    else:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(script_dir, "plantDisease-resnet34.pth")

    if not os.path.isfile(model_path):
        print(f"ERROR: Model file not found: {model_path}")
        sys.exit(1)

    # --- Load model ---
    device = get_default_device()
    print(f"Using device: {device}")
    print(f"Loading model from: {model_path}")

    try:
        model = load_model(model_path, device)
    except Exception as e:
        print(f"ERROR: Failed to load model — {e}")
        sys.exit(1)

    print(f"Model loaded successfully! Ready to predict {len(DISEASE_CLASSES)} disease classes.\n")

    # --- Check-only mode ---
    if args.check:
        print("--check passed. Model is valid. Exiting.")
        return

    # --- Predict ---
    if not args.image:
        print("No image path provided. Use:")
        print(f"  python {os.path.basename(__file__)} path/to/leaf.jpg")
        print(f"  python {os.path.basename(__file__)} --check")
        sys.exit(0)

    if not os.path.isfile(args.image):
        print(f"ERROR: Image file not found: {args.image}")
        sys.exit(1)

    results = predict_image(args.image, model, device, top_k=args.top_k)

    # Print results
    predicted_class, confidence = results[0]
    print(f"Predicted Disease: {predicted_class}")
    print(f"Confidence: {confidence * 100:.1f}%")
    print()
    print(f"Top {args.top_k} Predictions:")
    for i, (cls, conf) in enumerate(results):
        print(f"  {i + 1}. {cls:<55s} ({conf * 100:.1f}%)")


if __name__ == "__main__":
    main()
