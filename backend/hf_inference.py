import os
import io
import requests
from PIL import Image

# ─────────────────────────────────────────────────────────────────────────────
# Hugging Face Inference Examples (Pneumonia Detection)
#
# This script demonstrates two ways to use a pre-trained model from Hugging Face:
# 1. Local Inference (runs on your CPU/GPU)
# 2. API Inference (runs on Hugging Face servers, great for low-end laptops)
#
# Replace the model ID below with the specific model you want to use.
# Popular options:
# - "ianpan/pneumonia-cxr" (if compatible with HF Transformers)
# - "nickmuchi/vit-finetuned-chest-xray-pneumonia"
# - "lxyuan/vit-xray-pneumonia-classification"
# ─────────────────────────────────────────────────────────────────────────────

MODEL_ID = "nickmuchi/vit-finetuned-chest-xray-pneumonia"


def run_local_inference(image_path: str):
    """
    Runs the model locally using the `transformers` library.
    Requires: pip install transformers torch torchvision
    """
    print(f"\n--- Running LOCAL Inference using {MODEL_ID} ---")
    try:
        from transformers import pipeline
    except ImportError:
        print("Please install transformers: pip install transformers torch")
        return

    # Load the image
    image = Image.open(image_path).convert("RGB")
    
    # Initialize the pipeline (this downloads the model on first run)
    print("Loading model... (this may take a while the first time)")
    classifier = pipeline("image-classification", model=MODEL_ID)
    
    # Run inference (the pipeline handles resizing/preprocessing automatically!)
    results = classifier(image)
    
    print("Results:")
    for res in results:
        print(f" - {res['label']}: {res['score'] * 100:.2f}%")
        
    return results


def run_api_inference(image_path: str, hf_token: str):
    """
    Runs the model via Hugging Face Inference API.
    No local compute required!
    """
    print(f"\n--- Running API Inference using {MODEL_ID} ---")
    
    API_URL = f"https://api-inference.huggingface.co/models/{MODEL_ID}"
    headers = {"Authorization": f"Bearer {hf_token}"}
    
    # Read the image file as bytes
    with open(image_path, "rb") as f:
        data = f.read()
        
    print("Sending request to Hugging Face...")
    response = requests.post(API_URL, headers=headers, data=data)
    
    if response.status_code != 200:
        print(f"Error {response.status_code}: {response.text}")
        return
        
    results = response.json()
    print("Results:")
    for res in results:
        print(f" - {res['label']}: {res['score'] * 100:.2f}%")
        
    return results


if __name__ == "__main__":
    # Example usage (you need a sample image in this directory named 'sample_xray.jpg')
    sample_img = "sample_xray.jpg"
    
    if not os.path.exists(sample_img):
        # Create a dummy image just for testing the script execution
        img = Image.new('RGB', (224, 224), color = 'gray')
        img.save(sample_img)
        print(f"Created a dummy '{sample_img}' for testing.")
        
    # --- 1. Test API (Recommended for low-end laptops) ---
    # Get your free token at https://huggingface.co/settings/tokens
    HF_TOKEN = os.environ.get("HF_API_TOKEN")
    if HF_TOKEN:
        run_api_inference(sample_img, HF_TOKEN)
    else:
        print("Set HF_API_TOKEN environment variable to test the API inference.")
        print("Example: export HF_API_TOKEN='hf_your_token_here'")
        
    # --- 2. Test Local (Uncomment if you want to download and run locally) ---
    # run_local_inference(sample_img)
