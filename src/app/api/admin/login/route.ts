import { endAdminSession, passwordMatches, startAdminSession } from "@/lib/auth";
import { fail, json, readBody, str } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await readBody(req);
  if (!passwordMatches(str(body.password, 200))) {
    await new Promise((r) => setTimeout(r, 800));
    return fail("Wrong password.", 401);
  }
  await startAdminSession();
  return json();
}

export async function DELETE() {
  await endAdminSession();
  return json();
}
