"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { LOGO, LOGO_SMALL } from "@/lib/brand";

export default function Header() {
  const [me, setMe] = useState<any>(null);

  useEffect(() => {
    api("/api/me").then((r) => setMe(r.data?.participant ?? null));
  }, []);

  async function logout() {
    if (!confirm("Log out? You will need your access code to sign back in.")) return;
    await api("/api/auth/logout", { method: "POST", body: {} });
    window.location.href = "/";
  }

  return (
    <header className="site-header">
      <div className="wrap">
        <Link href="/" className="brand">
          <img
            className="logo"
            src={LOGO_SMALL}
            alt=""
            width={32}
            height={32}
            onError={(e) => {
              const el = e.currentTarget;
              if (el.src !== LOGO) el.src = LOGO;
            }}
          />
          Osmotix
        </Link>
        <nav className="nav" aria-label="Main">
          <Link href="/">Quests</Link>
          <Link href="/leaderboard">Leaderboard</Link>
        </nav>
        <div className="who">
          {me ? (
            <>
              <span className="name">@{me.x_handle}</span>
              <button className="btn ghost small" onClick={logout}>Log out</button>
            </>
          ) : (
            <Link className="btn small" href="/#join">Join</Link>
          )}
        </div>
      </div>
    </header>
  );
}