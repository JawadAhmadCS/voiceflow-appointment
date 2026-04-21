import { NextResponse } from "next/server";
import postgres from "postgres";

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function withCors<T extends NextResponse | Response>(res: T): T {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => {
    res.headers.set(k, v);
  });
  return res;
}

export function corsOptions(): NextResponse {
  return withCors(new NextResponse(null, { status: 204 }));
}

export type Status = "pending" | "confirmed" | "cancelled";

export type Appointment = {
  id: string;
  name: string;
  phone: string;
  service: string;
  date: string;
  time: string;
  city: string;
  status: Status;
  createdAt: string;
};

export type CreateAppointmentInput = {
  name: string;
  phone: string;
  service: string;
  date: string;
  time: string;
  city: string;
};

const g = globalThis as unknown as {
  __appointmentsMem?: Appointment[];
  __appointmentsSql?: ReturnType<typeof postgres>;
};

function memoryStore(): Appointment[] {
  if (!g.__appointmentsMem) g.__appointmentsMem = [];
  return g.__appointmentsMem;
}

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (!g.__appointmentsSql) {
    g.__appointmentsSql = postgres(url, { prepare: false });
  }
  return g.__appointmentsSql;
}

let schemaEnsured = false;

async function ensurePgSchema(sql: ReturnType<typeof postgres>) {
  if (schemaEnsured) return;
  await sql`
    create table if not exists appointments (
      id uuid primary key default gen_random_uuid(),
      name text not null,
      phone text not null,
      service text not null,
      date text not null,
      time text not null,
      city text not null,
      status text not null default 'pending',
      created_at timestamptz not null default now()
    )
  `;
  schemaEnsured = true;
}

type PgAppointmentRow = {
  id: string;
  name: string;
  phone: string;
  service: string;
  date: string;
  time: string;
  city: string;
  status: string;
  created_at: Date;
};

function rowToAppointment(r: PgAppointmentRow): Appointment {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone,
    service: r.service,
    date: r.date,
    time: r.time,
    city: r.city,
    status: normalizeStatus(r.status),
    createdAt: new Date(r.created_at).toISOString(),
  };
}

function normalizeStatus(s: string): Status {
  const v = (s || "pending").toLowerCase();
  if (v === "confirmed" || v === "cancelled" || v === "pending") return v;
  return "pending";
}

export function parseStatusInput(v: unknown): Status | null {
  if (typeof v !== "string") return null;
  const x = v.toLowerCase().trim();
  if (x === "pending" || x === "confirmed" || x === "cancelled") return x;
  return null;
}

export type AppointmentFieldUpdates = Partial<{
  name: string;
  phone: string;
  service: string;
  date: string;
  time: string;
  city: string;
  status: Status;
}>;

function mergeAppointment(
  existing: Appointment,
  updates: AppointmentFieldUpdates
): Appointment {
  return {
    ...existing,
    ...(updates.name !== undefined ? { name: updates.name } : {}),
    ...(updates.phone !== undefined ? { phone: updates.phone } : {}),
    ...(updates.service !== undefined ? { service: updates.service } : {}),
    ...(updates.date !== undefined ? { date: updates.date } : {}),
    ...(updates.time !== undefined ? { time: updates.time } : {}),
    ...(updates.city !== undefined ? { city: updates.city } : {}),
    ...(updates.status !== undefined ? { status: updates.status } : {}),
  };
}

export async function updateAppointmentFields(
  id: string,
  updates: AppointmentFieldUpdates
): Promise<Appointment | null> {
  const sql = getSql();
  if (!sql) {
    const list = memoryStore();
    const i = list.findIndex((a) => a.id === id);
    if (i === -1) return null;
    list[i] = mergeAppointment(list[i], updates);
    return list[i];
  }
  await ensurePgSchema(sql);
  const existingRows = (await sql`
    select id, name, phone, service, date, time, city, status, created_at
    from appointments
    where id = ${id}
  `) as PgAppointmentRow[];
  const row = existingRows[0];
  if (!row) return null;
  const merged = mergeAppointment(rowToAppointment(row), updates);
  const out = (await sql`
    update appointments
    set
      name = ${merged.name},
      phone = ${merged.phone},
      service = ${merged.service},
      date = ${merged.date},
      time = ${merged.time},
      city = ${merged.city},
      status = ${merged.status}
    where id = ${id}
    returning id, name, phone, service, date, time, city, status, created_at
  `) as PgAppointmentRow[];
  return out[0] ? rowToAppointment(out[0]) : null;
}

export async function deleteAppointment(id: string): Promise<boolean> {
  const sql = getSql();
  if (!sql) {
    const list = memoryStore();
    const idx = list.findIndex((a) => a.id === id);
    if (idx === -1) return false;
    list.splice(idx, 1);
    return true;
  }
  await ensurePgSchema(sql);
  const rows = (await sql`
    delete from appointments
    where id = ${id}
    returning id
  `) as { id: string }[];
  return rows.length > 0;
}

export async function listAppointments(): Promise<Appointment[]> {
  const sql = getSql();
  if (!sql) {
    return [...memoryStore()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
  await ensurePgSchema(sql);
  const rows = (await sql`
    select id, name, phone, service, date, time, city, status, created_at
    from appointments
    order by created_at desc
  `) as PgAppointmentRow[];
  return rows.map(rowToAppointment);
}

export async function addAppointment(
  input: CreateAppointmentInput
): Promise<Appointment> {
  const sql = getSql();
  if (!sql) {
    const appt: Appointment = {
      id: crypto.randomUUID(),
      ...input,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    memoryStore().unshift(appt);
    return appt;
  }
  await ensurePgSchema(sql);
  const rows = (await sql`
    insert into appointments (name, phone, service, date, time, city, status)
    values (
      ${input.name},
      ${input.phone},
      ${input.service},
      ${input.date},
      ${input.time},
      ${input.city},
      'pending'
    )
    returning id, name, phone, service, date, time, city, status, created_at
  `) as PgAppointmentRow[];
  const row = rows[0];
  if (!row) throw new Error("Insert failed");
  return rowToAppointment(row);
}
