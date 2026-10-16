import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { fail, json, readBody, str } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const a = await requireAdmin();
  if ("error" in a) return a.error;

  const body = await readBody(req);
  const id = str(body.participant_id, 64);
  const banned = body.banned === true;
  if (!id) return fail("Missing participant.");

  const supabase = db();
  const { error } = await supabase.from("participants").update({ banned }).eq("id", id);
  if (error) return fail("Could not update that participant.", 500);
  await supabase.from("audit_log").insert({
    actor_id: null,
    action: banned ? "ban" : "unban",
    target: `participant:${id}`,
    detail: null,
  });
  return json();
}
