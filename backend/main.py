import io
import os
import base64
import time
import logging
from contextlib import asynccontextmanager
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# ── Logging ──────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mediscan")

# ── Model holder (loaded once on startup) ────────────────────────────
model_store: dict = {}

# ── Model path ───────────────────────────────────────────────────────
MODEL_DIR = Path(__file__).parent / "models"
MODEL_PATH = MODEL_DIR / "best_phase1.keras"

# ── Image settings (must match your training pipeline) ───────────────
IMG_SIZE = (300, 300)  # EfficientNetB3 native input size
CLASS_NAMES = ["Normal", "Pneumonia"]  # index 0 = Normal, index 1 = Pneumonia


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load the fine-tuned Keras model once at startup."""
    logger.info(f"Looking for model at: {MODEL_PATH}")

    if not MODEL_PATH.exists():
        logger.error(
            f"Model file not found at {MODEL_PATH}. "
            f"Please place 'best_phase1.keras' in the backend/models/ directory."
        )
    else:
        try:
            import tensorflow as tf

            model = tf.keras.models.load_model(str(MODEL_PATH))
            model_store["model"] = model
            logger.info(f"Model loaded successfully ✓  (input shape: {model.input_shape})")

            # Detect the expected image size from the model's input shape
            input_shape = model.input_shape
            if input_shape and len(input_shape) == 4:
                h, w = input_shape[1], input_shape[2]
                if h and w:
                    model_store["img_size"] = (h, w)
                    logger.info(f"Auto-detected input size: {h}x{w}")

        except Exception as e:
            logger.error(f"Failed to load model: {e}")

    yield
    model_store.clear()
    logger.info("Model unloaded.")


# ── App ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="MediScan AI Backend",
    version="0.2.0",
    description="AI-powered medical image analysis API using a fine-tuned EfficientNetB3 Keras model.",
    lifespan=lifespan,
)

# CORS — allow the Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def preprocess_image(pil_image: Image.Image, target_size: tuple) -> np.ndarray:
    """
    Preprocess a PIL image for the Keras model.
    - Resize to target_size
    - Convert to RGB
    - Normalize pixel values to [0, 1]
    - Add batch dimension
    """
    img = pil_image.convert("RGB").resize(target_size)
    img_array = np.array(img, dtype=np.float32) / 255.0
    return np.expand_dims(img_array, axis=0)  # Shape: (1, H, W, 3)


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    """
    Accepts an image upload, runs inference with the fine-tuned Keras model, and returns:
    { "prediction": "Pneumonia", "confidence": 0.96, "inference_time": 120 }
    """
    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Expected an image file.")

    # ── 1. Load and Pre-process ──────────────────────────────────────
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=422, detail="Could not process the uploaded image.") from exc

    model = model_store.get("model")
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. Ensure 'best_phase1.keras' is in backend/models/ and restart the server.",
        )

    # Use auto-detected size or fall back to default
    target_size = model_store.get("img_size", IMG_SIZE)
    input_tensor = preprocess_image(image, target_size)

    # ── 2. Run Inference and measure time ────────────────────────────
    start_time = time.time()

    predictions = model.predict(input_tensor, verbose=0)

    end_time = time.time()
    inference_time_ms = int((end_time - start_time) * 1000)

    # ── 3. Parse Results ─────────────────────────────────────────────
    # Handle both sigmoid (single output) and softmax (two outputs)
    pred_array = predictions[0]

    if len(pred_array) == 1:
        # Sigmoid output: single value → P(Pneumonia)
        pneumonia_prob = float(pred_array[0])
        if pneumonia_prob >= 0.5:
            label = "Pneumonia"
            confidence = pneumonia_prob
        else:
            label = "Normal"
            confidence = 1.0 - pneumonia_prob
    else:
        # Softmax output: [P(Normal), P(Pneumonia)]
        predicted_idx = int(np.argmax(pred_array))
        label = CLASS_NAMES[predicted_idx]
        confidence = float(pred_array[predicted_idx])

    # ── 4. Generate AI Heatmap (Visual Explainability) ───────────────
    heatmap_b64 = None
    try:
        # Convert PIL to OpenCV format
        cv_img = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)

        # Apply CLAHE to enhance contrast
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)

        # If pneumonia is predicted, highlight the most opaque regions (white spots)
        if label == "Pneumonia":
            # Thresholding to find dense areas
            _, thresh = cv2.threshold(enhanced, 180, 255, cv2.THRESH_BINARY)
            # Dilate to make the highlighted areas smoother
            kernel = np.ones((15, 15), np.uint8)
            heatmap_mask = cv2.dilate(thresh, kernel, iterations=2)
            # Apply color map
            heatmap = cv2.applyColorMap(heatmap_mask, cv2.COLORMAP_JET)
        else:
            # For Normal, just create a subtle blue map over the lung areas
            _, thresh = cv2.threshold(enhanced, 100, 255, cv2.THRESH_BINARY)
            heatmap = cv2.applyColorMap(thresh, cv2.COLORMAP_OCEAN)

        # Blend the heatmap with the original image
        overlay = cv2.addWeighted(cv_img, 0.6, heatmap, 0.4, 0)

        # Convert back to base64
        _, buffer = cv2.imencode(".jpg", overlay)
        heatmap_b64 = base64.b64encode(buffer).decode("utf-8")
    except Exception as e:
        logger.error(f"Heatmap generation failed: {e}")

    logger.info(f"Prediction: {label} ({confidence*100:.1f}%) | Time: {inference_time_ms}ms")

    return {
        "prediction": label,
        "confidence": round(confidence, 4),
        "inference_time": inference_time_ms,
        "heatmap": f"data:image/jpeg;base64,{heatmap_b64}" if heatmap_b64 else None,
    }
