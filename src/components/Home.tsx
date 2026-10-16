"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import DayStrip from "@/components/DayStrip";
import QuestPanel from "@/components/QuestPanel";

const LABEL: Record<string, string> = {
  Approved: "Approved",
  Pending: "In review",
  Rejected: "Rejected",
  Appealed: "Appeal in review",
  Upcoming: "Upcoming",
  Closed: "Closed",
  Open: "Open",
};

function statusOf(q: any, sub: any, now: number): string {
  if (sub) return sub.status;
  if (q.opens_at && now < Date.parse(q.opens_at)) return "Upcoming";
  if (q.closes_at && now > Date.parse(q.closes_at)) return "Closed";
  return "Open";
}

function JoinForm({ onDone }: { onDone: (code?: string) => void }) {
  const [mode, setMode] = useState<"join" | "signin">("join");
  const [x, setX] = useState("");
  const [tg, setTg] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function join() {
    setBusy(true);
    setError("");
    const r = await api("/api/join", { body: { x_username: x, telegram_username: tg } });
    setBusy(false);
    if (!r.ok) return setError(r.data?.error ?? "Could not join. Try again.");
    onDone(r.data?.access_code);
  }

  async function signIn() {
    setBusy(true);
    setError("");
    const r = await api("/api/auth/signin", { body: { x_username: x, access_code: code } });
    setBusy(false);
    if (!r.ok) return setError(r.data?.error ?? "Could not sign in. Try again.");
    onDone();
  }

  return (
    <div className="account" id="join">
      <div className="account-link" style={{ borderTop: 0, borderRadius: "var(--r)" }}>
        <strong>{mode === "join" ? "Join the campaign" : "Sign back in"}</strong>
        <p className="muted" style={{ marginTop: 4 }}>
          {mode === "join"
            ? "Enter your usernames once. Each X account can only be used for one profile, and the team checks every submission against these usernames."
            : "Enter your X username and the access code you were given when you joined."}
        </p>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="join-x">X username</label>
            <input id="join-x" className="input" placeholder="@yourname" value={x} onChange={(e) => setX(e.target.value)} maxLength={60} />
          </div>
          {mode === "join" ? (
            <div className="field">
              <label htmlFor="join-tg">Telegram username</label>
              <input id="join-tg" className="input" placeholder="@yourname" value={tg} onChange={(e) => setTg(e.target.value)} maxLength={60} />
            </div>
          ) : (
            <div className="field">
              <label htmlFor="join-code">Access code</label>
              <input id="join-code" className="input" placeholder="XXXX-XXXX" value={code} onChange={(e) => setCode(e.target.value)} maxLength={20} />
            </div>
          )}
        </div>
        <div className="row">
          {mode === "join" ? (
            <button className="btn" disabled={busy || !x.trim() || !tg.trim()} onClick={join}>
              {busy ? "Joining..." : "Join"}
            </button>
          ) : (
            <button className="btn" disabled={busy || !x.trim() || !code.trim()} onClick={signIn}>
              {busy ? "Signing in..." : "Sign in"}
            </button>
          )}
          <button className="btn ghost" onClick={() => { setMode(mode === "join" ? "signin" : "join"); setError(""); }}>
            {mode === "join" ? "Already joined? Sign back in" : "New here? Join"}
          </button>
        </div>
        {error ? <div className="msg err" role="alert">{error}</div> : null}
      </div>
    </div>
  );
}

export default function Home() {
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");
  const [quests, setQuests] = useState<any[]>([]);
  const [config, setConfig] = useState<{ xUrl: string | null; tgUrl: string | null }>({ xUrl: null, tgUrl: null });
  const [start, setStart] = useState<string | null>(null);
  const [nowIso, setNowIso] = useState(new Date().toISOString());
  const [me, setMe] = useState<any>(null);
  const [subs, setSubs] = useState<any[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [welcomeCode, setWelcomeCode] = useState("");

  const load = useCallback(async () => {
    const [q, m] = await Promise.all([api("/api/quests"), api("/api/me")]);
    if (!q.ok) return setState("error");
    setQuests(q.data.quests ?? []);
    setConfig(q.data.config ?? { xUrl: null, tgUrl: null });
    setStart(q.data.campaignStart ?? null);
    setNowIso(q.data.now ?? new Date().toISOString());
    setMe(m.data?.participant ?? null);
    setSubs(m.data?.submissions ?? []);
    setState("ready");
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const now = Date.parse(nowIso);
  const subFor = (id: number) => subs.find((s) => s.quest_id === id) ?? null;

  return (
    <>
      <section className="hero">
        <div className="wrap">
          <h1>Complete 15 quests in 30 days.</h1>
          <p className="lead">
            Earn campaign points for real contributions on X and Telegram. Submit proof, get it verified, and climb
            the Osmotix leaderboard. No wallet needed.
          </p>
          <div className="row">
            {me ? (
              <a className="btn white" href="#quests">View quests</a>
            ) : (
              <a className="btn white" href="#join">Join the campaign</a>
            )}
            <Link className="btn line-white" href="/leaderboard">Leaderboard</Link>
          </div>
          <DayStrip start={start} now={nowIso} />
        </div>
      </section>

      <div className="wrap">
        {welcomeCode ? (
          <div className="account" role="status">
            <div className="account-link" style={{ borderTop: 0, borderRadius: "var(--r)" }}>
              <strong>Save your access code</strong>
              <p style={{ marginTop: 4 }}>
                Your X account is now linked and cannot be used to create another profile. If you clear your browser
                or switch device, you need this code to sign back in. It is shown only once.
              </p>
              <p style={{ margin: "10px 0" }}><code className="code">{welcomeCode}</code></p>
              <button className="btn small" onClick={() => setWelcomeCode("")}>I saved it</button>
            </div>
          </div>
        ) : null}

        {me ? (
          <div className="account">
            <div className="account-top">
              <div className="stat">
                <span className="label">Approved points</span>
                <span className="big">{me.points}</span>
              </div>
              <div className="stat">
                <span className="label">X</span>
                <span className="value">@{me.x_handle}</span>
              </div>
              <div className="stat">
                <span className="label">Telegram</span>
                <span className="value">{me.telegram_username ? `@${me.telegram_username}` : "-"}</span>
              </div>
            </div>
          </div>
        ) : state === "ready" ? (
          <JoinForm onDone={(code) => { if (code) setWelcomeCode(code); load(); }} />
        ) : null}

        <section className="section" id="quests">
          <h2>Quests</h2>
          {state === "loading" ? <p className="muted" style={{ marginTop: 16 }}>Loading quests...</p> : null}
          {state === "error" ? (
            <div className="msg err" role="alert">
              Could not load quests. <button className="btn small ghost" onClick={load}>Try again</button>
            </div>
          ) : null}
          {state === "ready" && quests.length === 0 ? (
            <p className="muted" style={{ marginTop: 16 }}>Quests will appear here when the campaign opens.</p>
          ) : null}

          <ul className="quests">
            {quests.map((q) => {
              const sub = subFor(q.id);
              const status = statusOf(q, sub, now);
              const isOpen = open === q.id;
              return (
                <li className="quest" key={q.id}>
                  <button
                    className="quest-head"
                    aria-expanded={isOpen}
                    aria-controls={`quest-${q.id}`}
                    onClick={() => setOpen(isOpen ? null : q.id)}
                  >
                    <span className="q-id">{q.id}</span>
                    <span>
                      <span className="q-title">{q.title}</span>
                      <br />
                      <span className="q-meta">{q.channel}</span>
                    </span>
                    <span className="q-points">+{q.points}</span>
                    <span className={`chip ${status.toLowerCase()}`}>{LABEL[status] ?? status}</span>
                  </button>
                  {isOpen ? (
                    <div id={`quest-${q.id}`}>
                      <QuestPanel quest={q} sub={sub} me={me} config={config} now={now} onChange={load} />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </>
  );
}
