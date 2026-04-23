/**
 * POST /api/analyze
 *
 * 1. Forwards the uploaded image to the Python FastAPI server → gets prediction + confidence
 * 2. Sends the result to Groq (Llama 3.3 70B) → gets a clinical summary
 * 3. Returns everything as JSON to the frontend
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

// ── Groq chat completion (OpenAI-compatible REST API) ───────────────
async function generateClinicalSummary(prediction, confidence) {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not set in your environment.");
  }

  const prompt = `Based on an AI detection of "${prediction}" with ${(
    confidence * 100
  ).toFixed(
    1
  )}% confidence, write a brief, professional medical observation for a doctor reviewing a chest X-ray. 

Requirements:
- Keep it to 3-4 sentences maximum.
- Use clinical language appropriate for a medical professional.
- Mention the finding and confidence level.
- Suggest appropriate next steps if relevant.
- End with a clear disclaimer that this is AI-generated and should not replace professional medical judgment.`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a medical AI assistant that generates concise clinical observations. Be professional and precise.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 300,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      err.error?.message || `Groq API responded with ${res.status}`
    );
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
}

// ── Route handler ───────────────────────────────────────────────────
export async function POST(request) {
  try {
    // ── 1. Extract the uploaded file from the incoming FormData ──────
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json(
        { error: "No image file provided." },
        { status: 400 }
      );
    }

    // ── 2. Forward to FastAPI /predict ───────────────────────────────
    const fastApiForm = new FormData();
    fastApiForm.append("file", file);

    const predictRes = await fetch(`${FASTAPI_URL}/predict`, {
      method: "POST",
      body: fastApiForm,
    });

    if (!predictRes.ok) {
      const err = await predictRes.json().catch(() => ({}));
      return NextResponse.json(
        {
          error:
            err.detail ||
            `FastAPI server responded with ${predictRes.status}`,
        },
        { status: predictRes.status }
      );
    }

    const { prediction, confidence } = await predictRes.json();

    // ── 3. Generate clinical summary via Groq ───────────────────────
    let summary = null;

    try {
      summary = await generateClinicalSummary(prediction, confidence);
    } catch (groqErr) {
      console.error("Groq API error:", groqErr.message);
      // Don't fail the whole request — return prediction without summary
      summary = null;
    }

    // ── 3.5. Save to Database ───────────────────────────────────────
    // For now, we use a single "Default Patient". In a real app, this comes from Auth.
    let defaultPatient = await prisma.patient.findFirst({
      where: { email: "default@mediscan.ai" },
    });
    
    if (!defaultPatient) {
      defaultPatient = await prisma.patient.create({
        data: {
          name: "Default Patient",
          email: "default@mediscan.ai",
        },
      });
    }

    // Save the scan
    await prisma.scan.create({
      data: {
        patientId: defaultPatient.id,
        imageUrl: null, // Depending on if we upload it somewhere, right now it's just the memory
        prediction,
        confidence,
        summary,
      },
    });

    // ── 4. Return combined result ───────────────────────────────────
    return NextResponse.json({
      prediction,
      confidence,
      summary,
    });
  } catch (err) {
    console.error("Analysis route error:", err);
    return NextResponse.json(
      {
        error:
          err.message === "fetch failed"
            ? "Cannot reach the AI server. Is the FastAPI backend running on port 8000?"
            : err.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
