import postgres from "postgres";
import {
  fileStoreRead,
  readEncryptedBookings,
  withBookingsLock,
} from "./encrypted-file-store";

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

/**
 * Encrypted JSON file at `data/bookings.enc` (local / single server only).
 * Disabled on Vercel — serverless has no durable writable disk.
 */
function useEncryptedFile(): boolean {
  if (process.env.VERCEL === "1") return false;
  const key = process.env.BOOKINGS_ENCRYPTION_KEY?.trim();
  return Boolean(key && key.length >= 8);
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

/** Accept only explicit valid status values (for PATCH body). */
export function parseStatusInput(v: unknown): Status | null {
  if (typeof v !== "string") return null;
  const x = v.toLowerCase().trim();
  if (x === "pending" || x === "confirmed" || x === "cancelled") return x;
  return null;
}

export async function listAppointments(): Promise<Appointment[]> {
  const sql = getSql();
  if (!sql) {
    if (useEncryptedFile()) {
      const list = await fileStoreRead(() => readEncryptedBookings());
      return [...list].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
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
    if (useEncryptedFile()) {
      return withBookingsLock(async (list) => {
        const appt: Appointment = {
          id: crypto.randomUUID(),
          ...input,
          status: "pending",
          createdAt: new Date().toISOString(),
        };
        return { list: [appt, ...list], result: appt };
      });
    }
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

export async function updateAppointmentStatus(
  id: string,
  status: Status
): Promise<Appointment | null> {
  const sql = getSql();
  if (!sql) {
    if (useEncryptedFile()) {
      return withBookingsLock(async (list) => {
        const i = list.findIndex((a) => a.id === id);
        if (i === -1) return { list, result: null };
        const next = [...list];
        next[i] = { ...next[i], status };
        return { list: next, result: next[i] };
      });
    }
    const list = memoryStore();
    const i = list.findIndex((a) => a.id === id);
    if (i === -1) return null;
    list[i] = { ...list[i], status };
    return list[i];
  }
  await ensurePgSchema(sql);
  const rows = (await sql`
    update appointments
    set status = ${status}
    where id = ${id}
    returning id, name, phone, service, date, time, city, status, created_at
  `) as PgAppointmentRow[];
  if (!rows.length) return null;
  return rowToAppointment(rows[0]);
}
