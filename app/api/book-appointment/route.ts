import { NextRequest, NextResponse } from "next/server";
import { addAppointment } from "@/lib/appointments";
import { corsOptions, withCors } from "@/lib/cors";

export const runtime = "nodejs";

export async function OPTIONS() {
  return corsOptions();
}

const FIELDS = ["name", "phone", "service", "date", "time", "city"] as const;

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return withCors(
      NextResponse.json(
        { success: false, message: "Invalid JSON body" },
        { status: 400 }
      )
    );
  }

  for (const f of FIELDS) {
    const v = body[f];
    if (v == null || String(v).trim() === "") {
      return withCors(
        NextResponse.json(
          { success: false, message: `Missing or empty field: ${f}` },
          { status: 400 }
        )
      );
    }
  }

  await addAppointment({
    name: String(body.name).trim(),
    phone: String(body.phone).trim(),
    service: String(body.service).trim(),
    date: String(body.date).trim(),
    time: String(body.time).trim(),
    city: String(body.city).trim(),
  });

  return withCors(
    NextResponse.json({
      success: true,
      message: "Appointment booked successfully",
    })
  );
}
