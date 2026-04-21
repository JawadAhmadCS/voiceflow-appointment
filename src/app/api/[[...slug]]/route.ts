import { NextRequest, NextResponse } from "next/server";
import {
  addAppointment,
  corsOptions,
  deleteAppointment,
  listAppointments,
  parseStatusInput,
  updateAppointmentFields,
  type AppointmentFieldUpdates,
  withCors,
} from "@/bookings";
import { BOOKING_FIELDS } from "@/config";

export const runtime = "nodejs";

export async function OPTIONS() {
  return corsOptions();
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ slug?: string[] }> }
) {
  const slug = (await ctx.params).slug ?? [];
  if (slug.length === 1 && slug[0] === "appointments") {
    const appointments = await listAppointments();
    return withCors(NextResponse.json(appointments));
  }
  return withCors(NextResponse.json({ error: "Not found" }, { status: 404 }));
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ slug?: string[] }> }
) {
  const slug = (await ctx.params).slug ?? [];
  if (slug.length !== 1 || slug[0] !== "book-appointment") {
    return withCors(NextResponse.json({ error: "Not found" }, { status: 404 }));
  }

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

  for (const f of BOOKING_FIELDS) {
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

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ slug?: string[] }> }
) {
  const slug = (await ctx.params).slug ?? [];
  if (slug.length !== 2 || slug[0] !== "appointments") {
    return withCors(NextResponse.json({ error: "Not found" }, { status: 404 }));
  }
  const id = slug[1];

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return withCors(
      NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    );
  }

  const updates: AppointmentFieldUpdates = {};

  for (const key of BOOKING_FIELDS) {
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
  ctx: { params: Promise<{ slug?: string[] }> }
) {
  const slug = (await ctx.params).slug ?? [];
  if (slug.length !== 2 || slug[0] !== "appointments") {
    return withCors(NextResponse.json({ error: "Not found" }, { status: 404 }));
  }
  const id = slug[1];

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
