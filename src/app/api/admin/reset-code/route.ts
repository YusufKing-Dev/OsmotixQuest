import { db } from "@/lib/db";
import { hashAccessCode, newAccessCode, requireAdmin } from "@/lib/auth";
import { fail, json, readBody, str } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const a = await requireAdmin();
  if ("error" in a) return a.error;

  const body = await readBody(req);
  const id = str(body.participant_id, 64);
  if (!id) return fail("Missing participant.");

  const code = newAccessCode();
  const supabase = db();
  const { data, error } = await supabase
    .from("participants")
    .update({ access_code_hash: hashAccessCode(code) })
    .eq("id", id)
    .select("x_handle")
    .maybeSingle();
  if (error || !data) return fail("Could not reset that participant's code.", 500);

  await supabase.from("audit_log").insert({
    actor_id: null,
    action: "reset_access_code",
    target: `participant:${id}`,
    detail: null,
  });
  return json({ ok: true, access_code: code, x_handle: (data as any).x_handle });
}
