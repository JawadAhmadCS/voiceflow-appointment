import { NextRequest, NextResponse } from "next/server";
import {
  deleteAppointment,
  parseStatusInput,
  updateAppointmentFields,
  type AppointmentFieldUpdates,
} from "@/lib/appointments";
import { corsOptions, withCors } from "@/lib/cors";

export const runtime = "nodejs";

const STRING_FIELDS = [
  "name",
  "phone",
  "service",
  "date",
  "time",
  "city",
] as const;

export async function OPTIONS() {
  return corsOptions();
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return withCors(
      NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    );
  }

  const updates: AppointmentFieldUpdates = {};

  for (const key of STRING_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(body, key)) continue;
    const v = body[key];
    if (v == null || String(v).trim() === "") {
      return withCors(
        NextResponse.json(
          { error: `Field "${key}" cannot be empty` },
          { status: 400 }
        )
      );
    }
    updates[key] = String(v).trim();
  }

  if (Object.prototype.hasOwnProperty.call(body, "status")) {
    const status = parseStatusInput(body.status);
    if (!status) {
      return withCors(
        NextResponse.json(
          {
            error:
              "Invalid status. Use one of: pending, confirmed, cancelled",
          },
          { status: 400 }
        )
      );
    }
    updates.status = status;
  }

  if (Object.keys(updates).length === 0) {
    return withCors(
      NextResponse.json(
        { error: "Provide at least one field to update" },
        { status: 400 }
      )
    );
  }

  try {
    const updated = await updateAppointmentFields(id, updates);
    if (!updated) {
      return withCors(
        NextResponse.json({ error: "Appointment not found" }, { status: 404 })
      );
    }
    return withCors(NextResponse.json(updated));
  } catch {
    return withCors(
      NextResponse.json({ error: "Invalid appointment id" }, { status: 400 })
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  try {
    const ok = await deleteAppointment(id);
    if (!ok) {
      return withCors(
        NextResponse.json({ error: "Appointment not found" }, { status: 404 })
      );
    }
    return withCors(
      NextResponse.json({ success: true, message: "Appointment deleted" })
    );
  } catch {
    return withCors(
      NextResponse.json({ error: "Invalid appointment id" }, { status: 400 })
    );
  }
}
