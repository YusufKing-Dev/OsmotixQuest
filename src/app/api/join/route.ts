import { db } from "@/lib/db";
import { hashAccessCode, newAccessCode, startSession } from "@/lib/auth";
import { cleanHandle } from "@/lib/handles";
import { fail, json, readBody, str } from "@/lib/http";

export const dynamic = "force-dynamic";

const TAKEN =
  "That X account is already linked to a participant and cannot be used again. If it is yours, sign back in with your access code.";

export async function POST(req: Request) {
  const body = await readBody(req);
  const x = cleanHandle(str(body.x_username, 120), 1);
  const tg = cleanHandle(str(body.telegram_username, 120), 5);
  if (!x || x.length > 15) return fail("Enter your X username (letters, numbers, underscore, up to 15 characters).");
  if (!tg) return fail("Enter your Telegram username (at least 5 characters, no spaces).");

  const supabase = db();
  const { data: found } = await supabase.from("participants").select("id").eq("x_handle", x).maybeSingle();
  if (found) return fail(TAKEN, 409);

  const code = newAccessCode();
  const { data: created, error } = await supabase
    .from("participants")
    .insert({ x_handle: x, telegram_username: tg, access_code_hash: hashAccessCode(code) })
    .select("id")
    .maybeSingle();
  if (error) return error.code === "23505" ? fail(TAKEN, 409) : fail("Could not create your profile. Try again.", 500);
  if (!created) return fail("Could not create your profile. Try again.", 500);

  await startSession(created.id);
  return json({ ok: true, access_code: code });
}
