import { NextRequest, NextResponse } from "next/server";
import { parseStatusInput, updateAppointmentStatus } from "@/lib/appointments";
import { corsOptions, withCors } from "@/lib/cors";

export const runtime = "nodejs";

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

  try {
    const updated = await updateAppointmentStatus(id, status);
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
