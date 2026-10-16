import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { fail, json } from "@/lib/http";

export const dynamic = "force-dynamic";

const STATUSES = ["Pending", "Appealed", "Approved", "Rejected"];

export async function GET(req: NextRequest) {
  const a = await requireAdmin();
  if ("error" in a) return a.error;

  const status = req.nextUrl.searchParams.get("status") ?? "Pending";
  const quest = req.nextUrl.searchParams.get("quest");

  let q = db()
    .from("submissions")
    .select(
      "id, participant_id, quest_id, evidence, status, verification_method, points_awarded, rejection_reason, appeal_status, appeal_note, submitted_at, reviewed_at, participants(telegram_username, x_handle, banned), quests(title, kind)"
    );
  if (STATUSES.includes(status)) q = q.eq("status", status);
  if (quest && Number.isInteger(Number(quest))) q = q.eq("quest_id", Number(quest));

  const { data, error } = await q.order("submitted_at", { ascending: true }).limit(500);
  if (error) return fail("Could not load submissions.", 500);
  return json({ rows: data ?? [] });
}
