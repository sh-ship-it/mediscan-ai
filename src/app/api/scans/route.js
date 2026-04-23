import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // For now, we use a single "Default Patient". In a real app, this comes from Auth.
    let defaultPatient = await prisma.patient.findFirst({
      where: { email: "default@mediscan.ai" },
    });

    if (!defaultPatient) {
      return NextResponse.json({ scans: [] });
    }

    const scans = await prisma.scan.findMany({
      where: { patientId: defaultPatient.id },
      orderBy: { analyzedAt: "desc" },
    });

    return NextResponse.json({ scans });
  } catch (err) {
    console.error("Fetch history error:", err);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}
