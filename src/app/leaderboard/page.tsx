"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";

export default function LeaderboardPage() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/leaderboard").then((r) => {
      if (!r.ok) return setError(r.data?.error ?? "Could not load the leaderboard.");
      setRows(r.data.rows ?? []);
    });
  }, []);

  return (
    <div className="wrap section">
      <h2>Leaderboard</h2>
      <p className="muted" style={{ marginTop: 8 }}>Only approved quests count toward points.</p>
      {error ? <div className="msg err" role="alert">{error}</div> : null}
      {!rows && !error ? <p className="muted" style={{ marginTop: 16 }}>Loading...</p> : null}
      {rows && rows.length === 0 ? <p className="muted" style={{ marginTop: 16 }}>No points yet. Be the first on the board.</p> : null}
      {rows && rows.length > 0 ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Participant</th>
                <th className="num">Quests</th>
                <th className="num">Points</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.rank}-${r.name}`}>
                  <td>{r.rank}</td>
                  <td>{r.name}</td>
                  <td className="num">{r.quests_done}</td>
                  <td className="num"><strong>{r.points}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
