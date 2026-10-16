import { db } from "@/lib/db";
import { accessCodeMatches, startSession } from "@/lib/auth";
import { cleanHandle } from "@/lib/handles";
import { fail, json, readBody, str } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await readBody(req);
  const x = cleanHandle(str(body.x_username, 120), 1);
  const code = str(body.access_code, 40);
  if (!x || !code) return fail("Enter your X username and your access code.");

  const { data } = await db().from("participants").select("*").eq("x_handle", x).maybeSingle();
  const p = data as any;
  if (!p || !accessCodeMatches(code, p.access_code_hash)) {
    await new Promise((r) => setTimeout(r, 800));
    return fail("That username and access code do not match.", 401);
  }
  if (p.banned) return fail("This account has been blocked from the campaign.", 403);

  await startSession(p.id);
  return json();
}
