"use client";

import { useState } from "react";
import { api } from "@/lib/client";

const HOURS_48 = 48 * 60 * 60 * 1000;

export default function QuestPanel({
  quest,
  sub,
  me,
  config,
  now,
  onChange,
}: {
  quest: any;
  sub: any;
  me: any;
  config: { xUrl: string | null; tgUrl: string | null };
  now: number;
  onChange: () => void;
}) {
  const [value, setValue] = useState("");
  const [xUser, setXUser] = useState(me ? `@${me.x_handle}` : "");
  const [tgUser, setTgUser] = useState(me?.telegram_username ? `@${me.telegram_username}` : "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [good, setGood] = useState("");

  const upcoming = quest.opens_at && now < Date.parse(quest.opens_at);
  const closed = quest.closes_at && now > Date.parse(quest.closes_at);
  const canSubmit = !upcoming && !closed && (!sub || (sub.status === "Rejected" && !sub.appeal_status));
  const canAppeal =
    sub?.status === "Rejected" &&
    !sub.appeal_status &&
    sub.reviewed_at &&
    now - Date.parse(sub.reviewed_at) < HOURS_48;

  async function submit() {
    setBusy(true);
    setError("");
    setGood("");
    const body =
      quest.kind === "username"
        ? { quest_id: quest.id, x_username: xUser, telegram_username: tgUser }
        : { quest_id: quest.id, evidence: value };
    const r = await api("/api/submit", { body });
    setBusy(false);
    if (!r.ok) return setError(r.data?.error ?? "Something went wrong.");
    setGood(r.data?.message ?? "Submitted.");
    setValue("");
    onChange();
  }

  async function appeal() {
    setBusy(true);
    setError("");
    setGood("");
    const r = await api("/api/appeal", { body: { submission_id: sub.id, note } });
    setBusy(false);
    if (!r.ok) return setError(r.data?.error ?? "Something went wrong.");
    setGood(r.data?.message ?? "Appeal sent.");
    setNote("");
    onChange();
  }

  const fmt = (iso: string) => new Date(iso).toISOString().replace("T", " ").slice(0, 16) + " UTC";
  const ready = quest.kind === "username" ? xUser.trim() && tgUser.trim() : value.trim();

  return (
    <div className="quest-panel">
      <p>{quest.description}</p>
      <p className="q-meta">
        {upcoming ? `Opens ${fmt(quest.opens_at)}. ` : ""}
        {quest.closes_at ? `Closes ${fmt(quest.closes_at)}.` : ""}
      </p>

      {quest.kind === "username" ? (
        <div className="links">
          {config.xUrl ? <a className="btn ghost small" href={config.xUrl} target="_blank" rel="noopener noreferrer">Follow on X</a> : null}
          {config.tgUrl ? <a className="btn ghost small" href={config.tgUrl} target="_blank" rel="noopener noreferrer">Join Telegram</a> : null}
        </div>
      ) : null}

      {sub ? (
        <div className="sub-box">
          <strong>Your submission:</strong> {sub.evidence}
          {sub.status === "Approved" ? <div>Approved. +{sub.points_awarded} points.</div> : null}
          {sub.status === "Pending" ? <div>Under verification. Points are added once the team approves it.</div> : null}
          {sub.status === "Appealed" ? <div>Your appeal is waiting for review.</div> : null}
          {sub.status === "Rejected" ? <div>Rejected: {sub.rejection_reason ?? "No reason given."}</div> : null}
        </div>
      ) : null}

      {!me ? (
        <p>
          <a href="#join">Join the campaign</a> at the top of the page to submit this quest.
        </p>
      ) : canSubmit ? (
        <>
          {quest.kind === "username" ? (
            <>
              <div className="field">
                <label htmlFor={`x-${quest.id}`}>Your X username</label>
                <input id={`x-${quest.id}`} className="input" value={xUser} onChange={(e) => setXUser(e.target.value)} maxLength={60} />
              </div>
              <div className="field">
                <label htmlFor={`tg-${quest.id}`}>Your Telegram username</label>
                <input id={`tg-${quest.id}`} className="input" value={tgUser} onChange={(e) => setTgUser(e.target.value)} maxLength={60} />
              </div>
            </>
          ) : (
            <div className="field">
              <label htmlFor={`ev-${quest.id}`}>{quest.kind === "link" ? "Link to your post" : "Your response"}</label>
              {quest.kind === "text" ? (
                <textarea id={`ev-${quest.id}`} className="textarea" value={value} onChange={(e) => setValue(e.target.value)} maxLength={2000} />
              ) : (
                <input
                  id={`ev-${quest.id}`}
                  className="input"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="https://x.com/yourname/status/..."
                  maxLength={500}
                />
              )}
            </div>
          )}
          <button className="btn" disabled={busy || !ready} onClick={submit}>
            {busy ? "Sending..." : sub ? "Submit again" : "Submit for verification"}
          </button>
        </>
      ) : null}

      {canAppeal ? (
        <div className="field">
          <label htmlFor={`ap-${quest.id}`}>Think this was a mistake? Appeal within 48 hours</label>
          <textarea id={`ap-${quest.id}`} className="textarea" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
          <div>
            <button className="btn ghost small" disabled={busy || note.trim().length < 10} onClick={appeal}>
              Send appeal
            </button>
          </div>
        </div>
      ) : null}

      {error ? <div className="msg err" role="alert">{error}</div> : null}
      {good ? <div className="msg good" role="status">{good}</div> : null}
    </div>
  );
}
