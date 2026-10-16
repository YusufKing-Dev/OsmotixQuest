import { db } from "@/lib/db";
import { fail, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data, error } = await db()
    .from("leaderboard")
    .select("name, points, quests_done")
    .order("points", { ascending: false })
    .order("quests_done", { ascending: false })
    .limit(200);
  if (error) return fail("Could not load the leaderboard.", 500);

  let lastPoints = -1;
  let lastRank = 0;
  const rows = ((data ?? []) as any[]).map((r, i) => {
    const rank = r.points === lastPoints ? lastRank : i + 1;
    lastPoints = r.points;
    lastRank = rank;
    return { rank, name: r.name, points: r.points, quests_done: r.quests_done };
  });
  return json({ rows });
}
