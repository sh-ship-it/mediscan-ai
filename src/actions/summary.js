"use server";

export async function generateClinicalSummary(prediction, confidence) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    return { success: false, error: "GROQ_API_KEY is not set in environment variables." };
  }

  const prompt = `Based on an AI detection of ${prediction} with ${(confidence * 100).toFixed(1)}% confidence from a chest X-ray, write a brief, professional medical observation for a doctor. Include a disclaimer that this is AI-generated and requires physician verification. Keep it to 2-3 sentences.`;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 150,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Groq API error:", data);
      return { success: false, error: data.error?.message || "Failed to generate summary" };
    }

    return { success: true, summary: data.choices[0].message.content.trim() };
  } catch (error) {
    console.error("Groq fetch error:", error);
    return { success: false, error: error.message };
  }
}
