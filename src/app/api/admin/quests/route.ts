import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { fail, json, readBody, str } from "@/lib/http";

export const dynamic = "force-dynamic";

const KINDS = ["link", "text", "username"];

function toIso(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  const t = Date.parse(String(v));
  return Number.isNaN(t) ? undefined : new Date(t).toISOString();
}

function clean(body: Record<string, unknown>, create: boolean): { data?: Record<string, unknown>; error?: string } {
  const out: Record<string, unknown> = {};

  if (create || "title" in body) {
    const v = str(body.title, 120);
    if (v.length < 3) return { error: "Title needs at least 3 characters." };
    out.title = v;
  }
  if (create || "description" in body) {
    const v = str(body.description, 1500);
    if (v.length < 10) return { error: "Instructions need at least 10 characters." };
    out.description = v;
  }
  if (create || "channel" in body) {
    const v = str(body.channel, 40);
    if (!v) return { error: "Pick a channel." };
    out.channel = v;
  }
  if (create || "points" in body) {
    const v = Number(body.points);
    if (!Number.isInteger(v) || v < 0 || v > 1000) return { error: "Points must be a whole number from 0 to 1000." };
    out.points = v;
  }
  if (create || "kind" in body) {
    const v = str(body.kind, 20);
    if (!KINDS.includes(v)) return { error: "Unknown quest type." };
    out.kind = v;
  }
  if ("sort_order" in body) {
    const v = Number(body.sort_order);
    if (!Number.isInteger(v)) return { error: "Order must be a whole number." };
    out.sort_order = v;
  }
  if ("active" in body) out.active = body.active === true;

  for (const key of ["opens_at", "closes_at"] as const) {
    if (key in body) {
      const v = toIso(body[key]);
      if (v === undefined) return { error: "Invalid date." };
      out[key] = v;
    }
  }
  return { data: out };
}

export async function GET() {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  const { data, error } = await db()
    .from("quests")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });
  if (error) return fail("Could not load quests.", 500);
  return json({ quests: data ?? [] });
}

export async function POST(req: Request) {
  const a = await requireAdmin();
  if ("error" in a) return a.error;

  const body = await readBody(req);
  const c = clean(body, true);
  if (!c.data) return fail(c.error ?? "Invalid quest.");

  const supabase = db();
  const { data: top } = await supabase.from("quests").select("id").order("id", { ascending: false }).limit(1);
  const nextId = ((top as any[] | null)?.[0]?.id ?? 0) + 1;

  const row = {
    active: true,
    sort_order: nextId,
    opens_at: null,
    closes_at: null,
    ...c.data,
    id: nextId,
  };
  const { error } = await supabase.from("quests").insert(row);
  if (error) return fail("Could not create the quest. Try again.", 500);
  await supabase.from("audit_log").insert({
    actor_id: null,
    action: "quest_create",
    target: `quest:${nextId}`,
    detail: { title: c.data.title },
  });
  return json({ ok: true, id: nextId });
}

export async function PATCH(req: Request) {
  const a = await requireAdmin();
  if ("error" in a) return a.error;

  const body = await readBody(req);
  const id = Number(body.id);
  if (!Number.isInteger(id)) return fail("Missing quest id.");
  const c = clean(body, false);
  if (!c.data) return fail(c.error ?? "Invalid quest.");
  if (!Object.keys(c.data).length) return fail("Nothing to update.");

  const supabase = db();
  const { error } = await supabase.from("quests").update(c.data).eq("id", id);
  if (error) return fail("Could not update the quest. Try again.", 500);
  await supabase.from("audit_log").insert({
    actor_id: null,
    action: "quest_update",
    target: `quest:${id}`,
    detail: { fields: Object.keys(c.data) },
  });
  return json();
}
