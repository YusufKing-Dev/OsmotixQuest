"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";

type Tab = "review" | "quests" | "audit";
const STATUS_FILTERS = ["Pending", "Appealed", "Approved", "Rejected", "all"];
const CHANNELS = ["X", "Telegram", "X + Telegram", "Website + X"];
const KINDS: { value: string; label: string }[] = [
  { value: "link", label: "Link to a post or page" },
  { value: "text", label: "Written response" },
  { value: "username", label: "X and Telegram usernames (follow / join tasks)" },
];

const toLocal = (iso?: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : "");
const fromLocal = (v: string) => (v ? new Date(`${v}:00Z`).toISOString() : null);
const one = (v: any) => (Array.isArray(v) ? v[0] : v);

/* ------------------------------ Review ------------------------------ */
function Review() {
  const [status, setStatus] = useState("Pending");
  const [questFilter, setQuestFilter] = useState("");
  const [quests, setQuests] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [good, setGood] = useState("");

  const load = useCallback(async () => {
    const qs = new URLSearchParams({ status });
    if (questFilter) qs.set("quest", questFilter);
    const r = await api(`/api/admin/submissions?${qs.toString()}`);
    if (!r.ok) return setError(r.data?.error ?? "Could not load submissions.");
    setRows(r.data.rows ?? []);
    setPicked([]);
  }, [status, questFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api("/api/admin/quests").then((r) => setQuests(r.data?.quests ?? []));
  }, []);

  async function act(action: "approve" | "reject") {
    setBusy(true);
    setError("");
    setGood("");
    const r = await api("/api/admin/review", { body: { ids: picked, action, reason } });
    setBusy(false);
    if (!r.ok) return setError(r.data?.error ?? "Something went wrong.");
    setGood(`${action === "approve" ? "Approved" : "Rejected"} ${r.data.changed} submission(s).`);
    setReason("");
    load();
  }

  async function ban(participantId: string, banned: boolean) {
    if (!confirm(banned ? "Ban this participant? Their points leave the leaderboard." : "Unban this participant?")) return;
    const r = await api("/api/admin/ban", { body: { participant_id: participantId, banned } });
    if (!r.ok) return setError(r.data?.error ?? "Something went wrong.");
    load();
  }

  async function resetCode(participantId: string, handle: string) {
    if (!confirm(`Generate a new access code for @${handle}? Their old code stops working.`)) return;
    const r = await api("/api/admin/reset-code", { body: { participant_id: participantId } });
    if (!r.ok) return setError(r.data?.error ?? "Something went wrong.");
    setError("");
    setGood(`New access code for @${r.data.x_handle}: ${r.data.access_code}. Send it to them privately.`);
  }

  async function copyHandles() {
    const handles = rows
      .map((r) => one(r.participants)?.x_handle)
      .filter(Boolean)
      .map((h: string) => `@${h}`)
      .join("\n");
    try {
      await navigator.clipboard.writeText(handles);
      setGood(`Copied ${handles ? handles.split("\n").length : 0} handle(s).`);
    } catch {
      setError("Could not copy. Select the handles in the table instead.");
    }
  }

  const allPicked = rows.length > 0 && picked.length === rows.length;

  return (
    <div>
      <div className="toolbar">
        <div className="filters" role="group" aria-label="Status filter">
          {STATUS_FILTERS.map((s) => (
            <button key={s} className="filter" aria-pressed={status === s} onClick={() => setStatus(s)}>
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>
        <select className="select" aria-label="Quest filter" value={questFilter} onChange={(e) => setQuestFilter(e.target.value)}>
          <option value="">All quests</option>
          {quests.map((q) => (
            <option key={q.id} value={q.id}>{q.id}. {q.title}</option>
          ))}
        </select>
        <button className="btn ghost small" onClick={copyHandles}>Copy X handles</button>
        <a className="btn ghost small" href="/api/admin/export">Export CSV</a>
      </div>

      <div className="toolbar">
        <input
          className="input"
          style={{ flex: 1 }}
          aria-label="Rejection reason"
          placeholder="Rejection reason (required to reject)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <button className="btn small" disabled={busy || !picked.length} onClick={() => act("approve")}>
          Approve selected ({picked.length})
        </button>
        <button className="btn danger small" disabled={busy || !picked.length} onClick={() => act("reject")}>
          Reject selected
        </button>
      </div>

      {error ? <div className="msg err" role="alert">{error}</div> : null}
      {good ? <div className="msg good" role="status">{good}</div> : null}

      {rows.length === 0 ? (
        <p className="muted" style={{ marginTop: 18 }}>Nothing here. New submissions appear as participants send them.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={allPicked}
                    onChange={() => setPicked(allPicked ? [] : rows.map((r) => r.id))}
                  />
                </th>
                <th>Participant</th>
                <th>Quest</th>
                <th>Evidence</th>
                <th>Status</th>
                <th>Submitted (UTC)</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const p = one(r.participants);
                const q = one(r.quests);
                const isLink = typeof r.evidence === "string" && r.evidence.startsWith("https://");
                return (
                  <tr key={r.id}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label="Select submission"
                        checked={picked.includes(r.id)}
                        onChange={() =>
                          setPicked((cur) => (cur.includes(r.id) ? cur.filter((x) => x !== r.id) : [...cur, r.id]))
                        }
                      />
                    </td>
                    <td>
                      {p?.x_handle ? <div>@{p.x_handle}</div> : null}
                      <div className="muted">{p?.telegram_username ? `tg @${p.telegram_username}` : ""}</div>
                      {p?.banned ? <div className="chip rejected">Banned</div> : null}
                    </td>
                    <td>{r.quest_id}. {q?.title}</td>
                    <td className="ev">
                      {isLink ? <a href={r.evidence} target="_blank" rel="noopener noreferrer">{r.evidence}</a> : r.evidence}
                      {r.appeal_note ? <div><strong>Appeal:</strong> {r.appeal_note}</div> : null}
                      {r.rejection_reason ? <div className="muted">Reason: {r.rejection_reason}</div> : null}
                    </td>
                    <td><span className={`chip ${String(r.status).toLowerCase()}`}>{r.status}</span></td>
                    <td>{new Date(r.submitted_at).toISOString().replace("T", " ").slice(0, 16)}</td>
                    <td>
                      <div className="row">
                        <button className="btn ghost small" onClick={() => ban(r.participant_id, !p?.banned)}>
                          {p?.banned ? "Unban" : "Ban"}
                        </button>
                        <button className="btn ghost small" onClick={() => resetCode(r.participant_id, p?.x_handle ?? "user")}>
                          Reset code
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Quests ------------------------------ */
const EMPTY = {
  id: 0,
  title: "",
  description: "",
  channel: "X",
  kind: "link",
  points: "10",
  opens_at: "",
  closes_at: "",
  sort_order: "",
  active: true,
};

function Quests() {
  const [quests, setQuests] = useState<any[]>([]);
  const [form, setForm] = useState<any>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [good, setGood] = useState("");

  const load = useCallback(async () => {
    const r = await api("/api/admin/quests");
    if (!r.ok) return setError(r.data?.error ?? "Could not load quests.");
    setQuests(r.data.quests ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set = (key: string, value: any) => setForm((f: any) => ({ ...f, [key]: value }));

  function edit(q: any) {
    setGood("");
    setError("");
    setForm({
      id: q.id,
      title: q.title,
      description: q.description,
      channel: q.channel,
      kind: q.kind,
      points: String(q.points),
      opens_at: toLocal(q.opens_at),
      closes_at: toLocal(q.closes_at),
      sort_order: String(q.sort_order),
      active: q.active,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save() {
    setBusy(true);
    setError("");
    setGood("");
    const body: Record<string, unknown> = {
      title: form.title,
      description: form.description,
      channel: form.channel,
      kind: form.kind,
      points: Number(form.points),
      opens_at: fromLocal(form.opens_at),
      closes_at: fromLocal(form.closes_at),
      active: form.active,
    };
    if (form.sort_order !== "") body.sort_order = Number(form.sort_order);
    if (form.id) body.id = form.id;
    const r = await api("/api/admin/quests", { method: form.id ? "PATCH" : "POST", body });
    setBusy(false);
    if (!r.ok) return setError(r.data?.error ?? "Something went wrong.");
    setGood(form.id ? "Quest updated." : "Quest added. It is live now.");
    setForm(EMPTY);
    load();
  }

  return (
    <div>
      <div className="card">
        <h3>{form.id ? `Edit quest ${form.id}` : "Add a new quest"}</h3>
        <div className="form-grid">
          <div className="field full">
            <label htmlFor="q-title">Title</label>
            <input id="q-title" className="input" value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={120} />
          </div>
          <div className="field full">
            <label htmlFor="q-desc">Instructions shown to participants</label>
            <textarea id="q-desc" className="textarea" value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={1500} />
          </div>
          <div className="field">
            <label htmlFor="q-channel">Channel</label>
            <select id="q-channel" className="select" value={form.channel} onChange={(e) => set("channel", e.target.value)}>
              {CHANNELS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="q-points">Points</label>
            <input id="q-points" className="input" type="number" min={0} max={1000} value={form.points} onChange={(e) => set("points", e.target.value)} />
          </div>
          <div className="field full">
            <label htmlFor="q-kind">How it is verified</label>
            <select id="q-kind" className="select" value={form.kind} onChange={(e) => set("kind", e.target.value)}>
              {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="q-open">Opens (UTC)</label>
            <input id="q-open" className="input" type="datetime-local" value={form.opens_at} onChange={(e) => set("opens_at", e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="q-close">Closes (UTC)</label>
            <input id="q-close" className="input" type="datetime-local" value={form.closes_at} onChange={(e) => set("closes_at", e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="q-order">Display order (optional)</label>
            <input id="q-order" className="input" type="number" value={form.sort_order} onChange={(e) => set("sort_order", e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="q-active">Visibility</label>
            <select id="q-active" className="select" value={form.active ? "yes" : "no"} onChange={(e) => set("active", e.target.value === "yes")}>
              <option value="yes">Visible to participants</option>
              <option value="no">Hidden</option>
            </select>
          </div>
        </div>
        {error ? <div className="msg err" role="alert">{error}</div> : null}
        {good ? <div className="msg good" role="status">{good}</div> : null}
        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn" disabled={busy} onClick={save}>{form.id ? "Save changes" : "Add quest"}</button>
          {form.id ? <button className="btn ghost" onClick={() => setForm(EMPTY)}>Cancel edit</button> : null}
        </div>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Title</th>
              <th>Channel</th>
              <th>Type</th>
              <th className="num">Points</th>
              <th>Window (UTC)</th>
              <th>Visible</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {quests.map((q) => (
              <tr key={q.id}>
                <td>{q.id}</td>
                <td>{q.title}</td>
                <td>{q.channel}</td>
                <td>{q.kind}</td>
                <td className="num">{q.points}</td>
                <td>
                  {q.opens_at ? toLocal(q.opens_at).replace("T", " ") : "always"} to {q.closes_at ? toLocal(q.closes_at).replace("T", " ") : "no end"}
                </td>
                <td>{q.active ? "Yes" : "Hidden"}</td>
                <td><button className="btn ghost small" onClick={() => edit(q)}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------- Audit ------------------------------ */
function Audit() {
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/admin/audit").then((r) => {
      if (!r.ok) return setError(r.data?.error ?? "Could not load the audit log.");
      setRows(r.data.rows ?? []);
    });
  }, []);

  return (
    <div>
      {error ? <div className="msg err" role="alert">{error}</div> : null}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>When (UTC)</th>
              <th>Action</th>
              <th>Target</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.created_at).toISOString().replace("T", " ").slice(0, 19)}</td>
                <td>{r.action}</td>
                <td className="ev">{r.target}</td>
                <td className="ev">{r.detail ? JSON.stringify(r.detail) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && !error ? <p className="muted" style={{ marginTop: 14 }}>No activity yet.</p> : null}
    </div>
  );
}

/* ------------------------------- Shell ------------------------------ */
export default function AdminPanel() {
  const [access, setAccess] = useState<"checking" | "yes" | "login">("checking");
  const [tab, setTab] = useState<Tab>("review");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api("/api/admin/quests").then((r) => setAccess(r.ok ? "yes" : "login"));
  }, []);

  async function login() {
    setBusy(true);
    setError("");
    const r = await api("/api/admin/login", { body: { password } });
    setBusy(false);
    if (!r.ok) return setError(r.data?.error ?? "Could not log in.");
    setPassword("");
    setAccess("yes");
  }

  async function logout() {
    await api("/api/admin/login", { method: "DELETE" });
    setAccess("login");
  }

  if (access === "checking") return <div className="wrap section"><p className="muted">Checking access...</p></div>;
  if (access === "login") {
    return (
      <div className="center-card">
        <h1>Admin</h1>
        <div className="field">
          <label htmlFor="admin-pw">Password</label>
          <input
            id="admin-pw"
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && password) login(); }}
          />
        </div>
        <button className="btn" disabled={busy || !password} onClick={login}>Log in</button>
        {error ? <div className="msg err" role="alert">{error}</div> : null}
      </div>
    );
  }

  return (
    <div className="wrap section">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2>Admin</h2>
        <button className="btn ghost small" onClick={logout}>Log out</button>
      </div>
      <div className="tabs" role="tablist">
        {(["review", "quests", "audit"] as Tab[]).map((t) => (
          <button key={t} role="tab" className="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
            {t === "review" ? "Review" : t === "quests" ? "Quests" : "Audit log"}
          </button>
        ))}
      </div>
      {tab === "review" ? <Review /> : null}
      {tab === "quests" ? <Quests /> : null}
      {tab === "audit" ? <Audit /> : null}
    </div>
  );
}
