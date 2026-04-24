# MediScan AI 🫁🤖

**See Beyond the Scan. Instant, AI-Powered Diagnostic Assistance.**

MediScan AI is a powerful, full-stack application designed to assist medical professionals by providing instant, highly accurate AI analysis of chest X-rays. Built for the modern healthcare era, it combines deep learning (EfficientNetB3) with blazing-fast Large Language Models (Llama 3 via Groq) to deliver a diagnosis and an explainable clinical summary in under two seconds.

**Created by Team Revnant**: Shubham, Bhumika, Nehul, Vedant.

---

## ✨ Key Features
- **Instant Inference:** Drag-and-drop a medical image and receive a diagnosis in ~1.5 seconds.
- **Explainable AI:** Generates human-readable clinical summaries using Llama 3 to explain the AI's confidence.
- **Patient History Dashboards:** A centralized dashboard to visually track patient infection probability over time.
- **High Accuracy:** Our underlying model achieves ~96% accuracy on the Paul Mooney Chest X-Ray dataset.
- **Zero-Friction UI:** Built with Next.js, Glassmorphism, and responsive modern components.

---

## 🛠️ Technology Stack
- **Frontend**: Next.js (App Router), Tailwind CSS, Magic UI.
- **Backend (Inference Engine)**: FastAPI (Python), TensorFlow (CPU), Uvicorn.
- **Database & Storage**: Supabase (PostgreSQL).
- **LLM Integration**: Groq API (Llama 3 70B).

---

## 🚀 Installation Guide (For Judges)

This application runs two separate servers: a Python Backend for the heavy AI model, and a Node.js Frontend for the UI. 

### ⚠️ IMPORTANT PREREQUISITE: Git LFS
Because our highly-trained AI model (`best_phase1.keras`) is 176MB, it is stored using **Git Large File Storage (LFS)**. You **must** install Git LFS before cloning the repository.

1. Install Git LFS: https://git-lfs.github.com/
2. Run `git lfs install` in your terminal.
3. Clone the repository: 
   ```bash
   git clone https://github.com/sh-ship-it/mediscan-ai.git
   cd mediscan-ai
   git lfs pull
   ```
*(If you do not run `git lfs pull`, the backend will crash because it will try to load a tiny text pointer instead of the actual model).*

---

### Step 1: Set up the Backend (FastAPI + AI Model)
Open a terminal in the `mediscan-ai` root folder:

```bash
# Navigate to the backend directory
cd backend

# Create a virtual environment (Recommended)
python -m venv venv

# Activate the virtual environment
# -> On Windows:
.\venv\Scripts\activate
# -> On Mac/Linux:
source venv/bin/activate

# Install dependencies (We use tensorflow-cpu for fast, lightweight installation)
pip install -r requirements.txt

# Start the Python inference server
uvicorn main:app --reload --port 8000
```
*Leave this terminal running. The backend API is now live at `http://localhost:8000`.*

---

### Step 2: Set up the Frontend (Next.js)
Open a **new** terminal window, navigate back to the `mediscan-ai` root folder:

```bash
# Install Node dependencies
npm install
```

**Environment Variables:**
Create a `.env.local` file in the root `mediscan-ai` directory. You will need to insert the provided API keys (Supabase & Groq) to enable database tracking and clinical summaries.
```env
NEXT_PUBLIC_SUPABASE_URL="your_supabase_url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your_supabase_anon_key"
GROQ_API_KEY="your_groq_api_key"
NEXT_PUBLIC_API_URL="http://localhost:8000"
```

```bash
# Start the frontend development server
npm run dev
```

---

### Step 3: Test the Application
1. Open your browser and navigate to **http://localhost:3000**
2. Scroll to the upload section and drag-and-drop a sample chest X-ray.
3. Click "Analyze Image" and watch the magic happen! You can click "Dashboard" in the floating navbar to see the history.
