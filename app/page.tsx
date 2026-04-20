"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useState } from "react";

type Status = "pending" | "confirmed" | "cancelled";

type Appointment = {
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

const STATUSES: Status[] = ["pending", "confirmed", "cancelled"];

function formatCreatedAt(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function labelStatus(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function DashboardPage() {
  const [rows, setRows] = useState<Appointment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/appointments", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as Appointment[];
      setRows(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  async function onStatusChange(id: string, status: Status) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(await res.text());
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "1.5rem" }}>
      <header
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem" }}>Appointments</h1>
          <p style={{ margin: "0.25rem 0 0", color: "var(--muted)", fontSize: "0.9rem" }}>
            Live list (refreshes every 4 seconds). Voiceflow posts to{" "}
            <code style={{ fontSize: "0.85em" }}>/book-appointment</code>
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => load()}
            style={btnSecondary}
          >
            Refresh now
          </button>
          <a href="/landing.html" style={{ fontSize: "0.9rem" }}>
            Landing page
          </a>
        </div>
      </header>

      {error ? (
        <p style={{ color: "#b91c1c", marginBottom: "1rem" }} role="alert">
          {error}
        </p>
      ) : null}

      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          overflow: "auto",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
          <thead>
            <tr style={{ background: "#f8fafc", textAlign: "left" }}>
              {[
                "Name",
                "Phone",
                "Service",
                "Date",
                "Time",
                "City",
                "Created At",
                "Status",
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "0.75rem 1rem",
                    borderBottom: "1px solid var(--border)",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: "2rem 1rem", color: "var(--muted)" }}>
                  No bookings yet. Send a POST from Voiceflow to{" "}
                  <code>/book-appointment</code>.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={td}>{r.name}</td>
                  <td style={td}>{r.phone}</td>
                  <td style={td}>{r.service}</td>
                  <td style={td}>{r.date}</td>
                  <td style={td}>{r.time}</td>
                  <td style={td}>{r.city}</td>
                  <td style={td}>{formatCreatedAt(r.createdAt)}</td>
                  <td style={td}>
                    <select
                      aria-label={`Status for ${r.name}`}
                      value={r.status}
                      disabled={updatingId === r.id}
                      onChange={(e) =>
                        onStatusChange(r.id, e.target.value as Status)
                      }
                      style={{
                        padding: "0.35rem 0.5rem",
                        borderRadius: 6,
                        border: "1px solid var(--border)",
                        minWidth: 110,
                      }}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {labelStatus(s)}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const td: CSSProperties = {
  padding: "0.65rem 1rem",
  verticalAlign: "middle",
};

const btnSecondary: CSSProperties = {
  padding: "0.5rem 0.85rem",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "#fff",
  cursor: "pointer",
  fontSize: "0.9rem",
};
