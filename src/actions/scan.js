"use server";

import { supabase } from "@/lib/supabase";

export async function saveScanResult(patientId, imageUrl, prediction, confidence, inferenceTime, summary) {
  try {
    // 1. Ensure the dummy patient exists to prevent foreign key errors
    const { error: patientError } = await supabase
      .from("patients")
      .upsert(
        { id: patientId, name: "Default Patient", age: 30, gender: "Other" },
        { onConflict: "id" }
      );

    if (patientError) {
      console.warn("Could not upsert dummy patient. It might exist or RLS blocked it:", patientError);
    }

    // 2. Insert the scan
    const { data, error } = await supabase
      .from("scans")
      .insert([
        {
          patient_id: patientId,
          image_url: imageUrl,
          prediction: prediction,
          confidence: confidence,
          inference_time: inferenceTime,
          summary: summary || null,
        },
      ])
      .select();

    if (error) {
      console.error("Supabase insert error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data[0] };
  } catch (err) {
    console.error("Failed to save scan:", err);
    return { success: false, error: err.message };
  }
}
