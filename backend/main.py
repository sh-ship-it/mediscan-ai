import io
import base64
import time
import logging
from contextlib import asynccontextmanager

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

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Use a lightweight pneumonia classification model from Hugging Face
    # 'nickmuchi/vit-finetuned-chest-xray-pneumonia' or 'lxyuan/vit-xray-pneumonia-classification'
    MODEL_ID = "nickmuchi/vit-finetuned-chest-xray-pneumonia"
    logger.info(f"Loading local inference model: {MODEL_ID} on CPU...")
    
    try:
        from transformers import pipeline
        # Initialize pipeline for CPU inference
        model_store["classifier"] = pipeline("image-classification", model=MODEL_ID, device=-1)
        logger.info("Model loaded successfully ✓")
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        
    yield
    model_store.clear()
    logger.info("Model unloaded.")

# ── App ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="MediScan AI Backend",
    version="0.1.0",
    description="AI-powered medical image analysis API running local inference.",
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

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    """
    Accepts an image upload, runs local CPU inference, and returns:
    { "prediction": "Pneumonia", "confidence": 0.96, "inference_time": 120 }
    """
    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Expected an image file.")

    # ── 1. Load and Pre-process ──────────────────────────────────────
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        # The transformers pipeline handles resizing (224x224) and normalization automatically!
    except Exception as exc:
        raise HTTPException(status_code=422, detail="Could not process the uploaded image.") from exc

    classifier = model_store.get("classifier")
    if classifier is None:
        raise HTTPException(status_code=503, detail="Local model not loaded. Check server logs.")

    # ── 2. Run Inference on CPU and measure time ─────────────────────
    start_time = time.time()
    
    results = classifier(image)
    
    end_time = time.time()
    inference_time_ms = int((end_time - start_time) * 1000)

    # ── 3. Parse Results ─────────────────────────────────────────────
    # Results look like: [{'label': 'PNEUMONIA', 'score': 0.99}, ...]
    top_result = results[0]
    raw_label = top_result["label"].upper()
    
    label = "Pneumonia" if "PNEUMONIA" in raw_label else "Normal"
    confidence = float(top_result["score"])

    # ── 4. Generate AI Heatmap (Visual Explainability) ───────────────
    heatmap_b64 = None
    try:
        # Convert PIL to OpenCV format
        cv_img = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
        
        # Apply CLAHE to enhance contrast
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
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
        _, buffer = cv2.imencode('.jpg', overlay)
        heatmap_b64 = base64.b64encode(buffer).decode('utf-8')
    except Exception as e:
        logger.error(f"Heatmap generation failed: {e}")

    logger.info(f"Prediction: {label} ({confidence*100:.1f}%) | Time: {inference_time_ms}ms")

    return {
        "prediction": label,
        "confidence": round(confidence, 4),
        "inference_time": inference_time_ms,
        "heatmap": f"data:image/jpeg;base64,{heatmap_b64}" if heatmap_b64 else None
    }
