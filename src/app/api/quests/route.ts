import { db } from "@/lib/db";
import { fail, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data, error } = await db()
    .from("quests")
    .select("id, title, description, channel, points, kind, opens_at, closes_at, sort_order")
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });
  if (error) return fail("Could not load quests.", 500);

  const quests = (data ?? []) as any[];
  const opens = quests.map((q) => q.opens_at).filter(Boolean).sort();
  return json({
    quests,
    now: new Date().toISOString(),
    campaignStart: process.env.CAMPAIGN_START_UTC ?? opens[0] ?? null,
    config: {
      xUrl: process.env.X_PROFILE_URL ?? null,
      tgUrl: process.env.TELEGRAM_GROUP_URL ?? null,
    },
  });
}
