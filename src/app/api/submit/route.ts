import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, json, readBody, str } from "@/lib/http";
import { cleanHandle } from "@/lib/handles";
import type { Quest } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const a = await requireUser();
  if ("error" in a) return a.error;
  const p = a.user;

  const body = await readBody(req);
  const questId = Number(body.quest_id);
  if (!Number.isInteger(questId)) return fail("Pick a quest to submit.");

  const supabase = db();
  const { data: qd } = await supabase.from("quests").select("*").eq("id", questId).eq("active", true).maybeSingle();
  const quest = qd as Quest | null;
  if (!quest) return fail("That quest is not available.", 404);

  const now = Date.now();
  if (quest.opens_at && now < Date.parse(quest.opens_at)) return fail("This quest has not opened yet.");
  if (quest.closes_at && now > Date.parse(quest.closes_at)) return fail("Submissions for this quest are closed.");

  const { data: ed } = await supabase
    .from("submissions")
    .select("id, status, appeal_status")
    .eq("participant_id", p.id)
    .eq("quest_id", quest.id)
    .maybeSingle();
  const existing = ed as { id: string; status: string; appeal_status: string | null } | null;
  if (existing && !(existing.status === "Rejected" && !existing.appeal_status)) {
    return fail("You already submitted this quest.", 409);
  }

  let evidence = "";
  if (quest.kind === "username") {
    const x = cleanHandle(str(body.x_username, 120), 1);
    const tg = cleanHandle(str(body.telegram_username, 120), 5);
    if (!x || x.length > 15) return fail("Enter a valid X username.");
    if (!tg) return fail("Enter a valid Telegram username.");
    evidence = `X: @${x} | Telegram: @${tg}`;
  } else if (quest.kind === "link") {
    try {
      const u = new URL(str(body.evidence, 500));
      if (u.protocol !== "https:") throw new Error("not https");
      evidence = u.origin.toLowerCase() + u.pathname.replace(/\/+$/, "");
    } catch {
      return fail("Paste a full link starting with https://");
    }
  } else {
    evidence = str(body.evidence, 2000);
    if (evidence.length < 3) return fail("Write your answer in the box before submitting.");
  }

  const row = {
    participant_id: p.id,
    quest_id: quest.id,
    evidence,
    status: "Pending",
    verification_method: "manual",
    points_awarded: 0,
    rejection_reason: null,
    appeal_status: null,
    appeal_note: null,
    reviewer_id: null,
    submitted_at: new Date().toISOString(),
    reviewed_at: null,
  };

  const res = existing
    ? await supabase.from("submissions").update(row).eq("id", existing.id)
    : await supabase.from("submissions").insert(row);
  if (res.error) {
    return res.error.code === "23505"
      ? fail("That link was already submitted. Each link can only be used once.", 409)
      : fail("Could not save your submission. Try again.", 500);
  }
  return json({ ok: true, message: "Submitted. It stays under verification until the team approves it." });
}
