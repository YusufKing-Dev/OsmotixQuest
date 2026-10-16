import { db } from "@/lib/db";
import { currentParticipant } from "@/lib/auth";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const p = await currentParticipant();
  if (!p) return json({ participant: null, submissions: [] });
  const { data } = await db()
    .from("submissions")
    .select(
      "id, quest_id, evidence, status, points_awarded, rejection_reason, appeal_status, appeal_note, submitted_at, reviewed_at"
    )
    .eq("participant_id", p.id);
  const submissions = (data ?? []) as any[];
  const points = submissions
    .filter((s) => s.status === "Approved")
    .reduce((n, s) => n + (s.points_awarded ?? 0), 0);
  return json({
    participant: { id: p.id, x_handle: p.x_handle, telegram_username: p.telegram_username, points },
    submissions,
  });
}
