import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOpportunities } from "@/lib/opportunities";
import { scoreOpportunity, type Profile } from "@/lib/score";

type ProfileRow = {
  user_id: string;
  skills: string;
  interests: string;
  location: string | null;
  remote_pref: string | null;
  education: string | null;
  created_at: string;
};

const split = (s: string) =>
  s.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("user_id");
  if (!userId) return NextResponse.json({ error: "no user_id" }, { status: 400 });

  const row = db
    .prepare("SELECT * FROM profiles WHERE user_id = ?")
    .get(userId) as ProfileRow | undefined;
  if (!row) return NextResponse.json({ error: "no profile" }, { status: 404 });

  const profile: Profile = {
    skills: split(row.skills),
    interests: split(row.interests),
    location: row.location ?? "",
    remotePref: (row.remote_pref as Profile["remotePref"]) ?? "any",
    education: row.education ?? "",
  };

  const dismissed = new Set(
    db
      .prepare("SELECT opportunity_id FROM events WHERE user_id = ? AND action = 'dismiss'")
      .all(userId)
      .map((r) => (r as { opportunity_id: string }).opportunity_id)
  );

  const items = getOpportunities()
    .filter((o) => !dismissed.has(o.id))
    .map((o) => ({ ...o, ...scoreOpportunity(profile, o) }))
    .filter((o) => o.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  return NextResponse.json({ items });
}
