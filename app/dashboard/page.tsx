"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "./dashboard.module.css";

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

const emptyForm = {
  name: "",
  phone: "",
  service: "",
  date: "",
  time: "",
  city: "",
  status: "pending" as Status,
};

export default function DashboardPage() {
  const [rows, setRows] = useState<Appointment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<Appointment | null>(null);
  const [form, setForm] = useState(emptyForm);

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
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  function openEdit(r: Appointment) {
    setEditRow(r);
    setForm({
      name: r.name,
      phone: r.phone,
      service: r.service,
      date: r.date,
      time: r.time,
      city: r.city,
      status: r.status,
    });
  }

  function closeEdit() {
    setEditRow(null);
    setForm(emptyForm);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editRow) return;
    setBusyId(editRow.id);
    setError(null);
    try {
      const res = await fetch(`/api/appointments/${editRow.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          service: form.service.trim(),
          date: form.date.trim(),
          time: form.time.trim(),
          city: form.city.trim(),
          status: form.status,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      closeEdit();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusyId(null);
    }
  }

  async function onStatusChange(id: string, status: Status) {
    setBusyId(id);
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
      setBusyId(null);
    }
  }

  async function onDelete(id: string, name: string) {
    if (!confirm(`Delete appointment for “${name}”? This cannot be undone.`)) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/appointments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Appointments</h1>
            <p className={styles.sub}>
              Live list (refreshes every 5s). Voiceflow posts to{" "}
              <code style={{ color: "#5eead4", fontSize: "0.88em" }}>
                /book-appointment
              </code>
            </p>
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.btnPrimary} onClick={() => load()}>
              Refresh
            </button>
            <a className={styles.link} href="/">
              ← Home / landing
            </a>
          </div>
        </header>

        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                {[
                  "Name",
                  "Phone",
                  "Service",
                  "Date",
                  "Time",
                  "City",
                  "Created",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <th key={h} className={styles.th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className={styles.empty}>
                    No bookings yet. Send a POST from Voiceflow to{" "}
                    <code>/book-appointment</code>.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className={styles.tr}>
                    <td className={styles.td}>{r.name}</td>
                    <td className={styles.td}>{r.phone}</td>
                    <td className={styles.td}>{r.service}</td>
                    <td className={styles.td}>{r.date}</td>
                    <td className={styles.td}>{r.time}</td>
                    <td className={styles.td}>{r.city}</td>
                    <td className={styles.tdMuted}>{formatCreatedAt(r.createdAt)}</td>
                    <td className={styles.td}>
                      <select
                        aria-label={`Status for ${r.name}`}
                        className={styles.statusSelect}
                        value={r.status}
                        disabled={busyId === r.id}
                        onChange={(e) =>
                          onStatusChange(r.id, e.target.value as Status)
                        }
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {labelStatus(s)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className={styles.td}>
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          className={styles.iconBtn}
                          disabled={busyId === r.id}
                          onClick={() => openEdit(r)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className={`${styles.iconBtn} ${styles.danger}`}
                          disabled={busyId === r.id}
                          onClick={() => onDelete(r.id, r.name)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editRow ? (
        <div
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeEdit();
          }}
        >
          <form className={styles.modal} onSubmit={saveEdit} onClick={(e) => e.stopPropagation()}>
            <h2 id="edit-title">Edit appointment</h2>
            {(
              [
                ["name", "Name"],
                ["phone", "Phone"],
                ["service", "Service"],
                ["date", "Date"],
                ["time", "Time"],
                ["city", "City"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className={styles.field}>
                <label htmlFor={key}>{label}</label>
                <input
                  id={key}
                  required
                  value={form[key]}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [key]: e.target.value }))
                  }
                />
              </div>
            ))}
            <div className={styles.field}>
              <label htmlFor="status">Status</label>
              <select
                id="status"
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    status: e.target.value as Status,
                  }))
                }
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {labelStatus(s)}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.btn} onClick={closeEdit}>
                Cancel
              </button>
              <button
                type="submit"
                className={styles.btnPrimary}
                disabled={busyId === editRow.id}
              >
                Save changes
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
