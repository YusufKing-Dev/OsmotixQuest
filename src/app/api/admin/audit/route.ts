import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { fail, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  const { data, error } = await db()
    .from("audit_log")
    .select("id, actor_id, action, target, detail, created_at")
    .order("id", { ascending: false })
    .limit(150);
  if (error) return fail("Could not load the audit log.", 500);
  return json({ rows: data ?? [] });
}
