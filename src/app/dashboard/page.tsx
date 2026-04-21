"use client";

import { BOOKING_ROUTES } from "@/config";
import { useCallback, useEffect, useState } from "react";

const dashCss = `
.vfDash{min-height:100vh;background:linear-gradient(165deg,#0c1117 0%,#111a28 45%,#0d1520 100%);color:#e8edf4;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.vfDash .inner{max-width:1240px;margin:0 auto;padding:1.5rem 1.25rem 3rem}
.vfDash .header{display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:1rem;margin-bottom:1.5rem}
.vfDash .title{margin:0;font-size:1.65rem;font-weight:700;letter-spacing:-0.03em;background:linear-gradient(120deg,#5eead4,#38bdf8,#a78bfa);-webkit-background-clip:text;background-clip:text;color:transparent}
.vfDash .sub{margin:0.35rem 0 0;color:#8b9aaf;font-size:0.92rem;max-width:36rem}
.vfDash .actions{display:flex;flex-wrap:wrap;gap:0.6rem;align-items:center}
.vfDash .btn{padding:0.55rem 1rem;border-radius:10px;font-size:0.88rem;font-weight:600;cursor:pointer;border:1px solid rgba(255,255,255,0.12);background:rgba(26,35,50,0.9);color:#e8edf4;transition:background .2s,border-color .2s,transform .15s}
.vfDash .btn:hover{background:#1a2332;border-color:rgba(94,234,212,0.35)}
.vfDash .btnPrimary{padding:0.55rem 1rem;border-radius:10px;font-size:0.88rem;font-weight:600;cursor:pointer;border:none;background:linear-gradient(135deg,#5eead4,#2dd4bf);color:#042f2e;box-shadow:0 4px 20px rgba(94,234,212,0.25);transition:transform .15s,box-shadow .15s}
.vfDash .btnPrimary:hover{transform:translateY(-1px);box-shadow:0 6px 28px rgba(94,234,212,0.35)}
.vfDash .link{color:#5eead4;text-decoration:none;font-size:0.9rem;font-weight:500}
.vfDash .link:hover{text-decoration:underline}
.vfDash .error{color:#fca5a5;margin:0 0 1rem;padding:0.75rem 1rem;border-radius:10px;background:rgba(220,38,38,0.12);border:1px solid rgba(248,113,113,0.25)}
.vfDash .tableWrap{border-radius:16px;overflow:auto;border:1px solid rgba(255,255,255,0.08);background:rgba(20,27,36,0.85);box-shadow:0 24px 80px rgba(0,0,0,0.35);backdrop-filter:blur(8px)}
.vfDash .table{width:100%;border-collapse:collapse;font-size:0.875rem}
.vfDash .th{text-align:left;padding:0.85rem 1rem;font-weight:600;color:#94a3b8;text-transform:uppercase;font-size:0.72rem;letter-spacing:0.06em;border-bottom:1px solid rgba(255,255,255,0.08);background:rgba(12,17,23,0.95);white-space:nowrap}
.vfDash .tr{border-bottom:1px solid rgba(255,255,255,0.05);transition:background .15s}
.vfDash .tr:hover{background:rgba(94,234,212,0.04)}
.vfDash .td{padding:0.75rem 1rem;vertical-align:middle;color:#e2e8f0}
.vfDash .tdMuted{padding:0.75rem 1rem;vertical-align:middle;color:#94a3b8;font-size:0.82rem}
.vfDash .empty{padding:2.5rem 1.5rem;text-align:center;color:#8b9aaf}
.vfDash .statusSelect{padding:0.4rem 0.55rem;border-radius:8px;border:1px solid rgba(255,255,255,0.12);background:#141b24;color:#e8edf4;font-size:0.82rem;min-width:118px}
.vfDash .rowActions{display:flex;flex-wrap:wrap;gap:0.35rem}
.vfDash .iconBtn{padding:0.35rem 0.65rem;border-radius:8px;font-size:0.78rem;font-weight:600;cursor:pointer;border:1px solid rgba(255,255,255,0.12);background:rgba(26,35,50,0.8);color:#cbd5e1;transition:background .15s,border-color .15s,color .15s}
.vfDash .iconBtn:hover{background:#1e293b;border-color:rgba(94,234,212,0.35);color:#f1f5f9}
.vfDash .iconBtn.danger{border-color:rgba(248,113,113,0.35);color:#fca5a5}
.vfDash .iconBtn.danger:hover{background:rgba(127,29,29,0.25);border-color:rgba(248,113,113,0.55)}
.vfDash .overlay{position:fixed;inset:0;background:rgba(0,0,0,0.65);display:grid;place-items:center;z-index:50;padding:1rem}
.vfDash .modal{width:100%;max-width:440px;border-radius:16px;border:1px solid rgba(255,255,255,0.1);background:#141b24;padding:1.35rem 1.5rem;box-shadow:0 24px 80px rgba(0,0,0,0.5)}
.vfDash .modal h2{margin:0 0 1rem;font-size:1.15rem;color:#f1f5f9}
.vfDash .field{margin-bottom:0.85rem}
.vfDash .field label{display:block;font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:#94a3b8;margin-bottom:0.35rem}
.vfDash .field input,.vfDash .field select{width:100%;padding:0.55rem 0.65rem;border-radius:8px;border:1px solid rgba(255,255,255,0.12);background:#0c1117;color:#e8edf4;font-size:0.9rem}
.vfDash .modalActions{display:flex;gap:0.5rem;justify-content:flex-end;margin-top:1.25rem}
`;

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
      const res = await fetch(BOOKING_ROUTES.list, { cache: "no-store" });
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
    const t = setInterval(load, BOOKING_ROUTES.pollMs);
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
      const res = await fetch(BOOKING_ROUTES.item(editRow.id), {
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
      const res = await fetch(BOOKING_ROUTES.item(id), {
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
      const res = await fetch(BOOKING_ROUTES.item(id), { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="vfDash">
      <style dangerouslySetInnerHTML={{ __html: dashCss }} />
      <div className="inner">
        <header className="header">
          <div>
            <h1 className="title">Appointments</h1>
            <p className="sub">
              Live list (refreshes every {BOOKING_ROUTES.pollMs / 1000}s). Voiceflow
              posts to{" "}
              <code style={{ color: "#5eead4", fontSize: "0.88em" }}>
                {BOOKING_ROUTES.create}
              </code>
            </p>
          </div>
          <div className="actions">
            <button type="button" className="btnPrimary" onClick={() => load()}>
              Refresh
            </button>
            <a className="link" href="/">
              ← Home / landing
            </a>
          </div>
        </header>

        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="tableWrap">
          <table className="table">
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
                  <th key={h} className="th">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="empty">
                    No bookings yet. Send a POST from Voiceflow to{" "}
                    <code>{BOOKING_ROUTES.create}</code>.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="tr">
                    <td className="td">{r.name}</td>
                    <td className="td">{r.phone}</td>
                    <td className="td">{r.service}</td>
                    <td className="td">{r.date}</td>
                    <td className="td">{r.time}</td>
                    <td className="td">{r.city}</td>
                    <td className="tdMuted">{formatCreatedAt(r.createdAt)}</td>
                    <td className="td">
                      <select
                        aria-label={`Status for ${r.name}`}
                        className="statusSelect"
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
                    <td className="td">
                      <div className="rowActions">
                        <button
                          type="button"
                          className="iconBtn"
                          disabled={busyId === r.id}
                          onClick={() => openEdit(r)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="iconBtn danger"
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
          className="overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeEdit();
          }}
        >
          <form className="modal" onSubmit={saveEdit} onClick={(e) => e.stopPropagation()}>
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
              <div key={key} className="field">
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
            <div className="field">
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
            <div className="modalActions">
              <button type="button" className="btn" onClick={closeEdit}>
                Cancel
              </button>
              <button
                type="submit"
                className="btnPrimary"
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
