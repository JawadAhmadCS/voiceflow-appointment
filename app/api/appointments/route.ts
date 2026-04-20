import { NextResponse } from "next/server";
import { listAppointments } from "@/lib/appointments";
import { corsOptions, withCors } from "@/lib/cors";

export const runtime = "nodejs";

export async function OPTIONS() {
  return corsOptions();
}

export async function GET() {
  const appointments = await listAppointments();
  return withCors(NextResponse.json(appointments));
}
