import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

function cell(v: unknown): string {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // block spreadsheet formula injection
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET() {
  const a = await requireAdmin();
  if ("error" in a) return a.error;

  const { data } = await db()
    .from("submissions")
    .select(
      "quest_id, status, evidence, verification_method, points_awarded, rejection_reason, appeal_status, submitted_at, reviewed_at, participants(telegram_username, x_handle, banned), quests(title)"
    )
    .order("submitted_at", { ascending: true })
    .limit(20000);

  const head = [
    "quest_id", "quest", "status", "points", "evidence", "method",
    "telegram_username", "x_handle", "banned",
    "rejection_reason", "appeal", "submitted_at", "reviewed_at",
  ];
  const lines = [head.join(",")];
  for (const r of (data ?? []) as any[]) {
    const p = Array.isArray(r.participants) ? r.participants[0] : r.participants;
    const q = Array.isArray(r.quests) ? r.quests[0] : r.quests;
    lines.push(
      [
        r.quest_id, q?.title, r.status, r.points_awarded, r.evidence, r.verification_method,
        p?.telegram_username, p?.x_handle, p?.banned,
        r.rejection_reason, r.appeal_status, r.submitted_at, r.reviewed_at,
      ]
        .map(cell)
        .join(",")
    );
  }

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="osmotix-submissions.csv"',
      "Cache-Control": "no-store",
    },
  });
}
