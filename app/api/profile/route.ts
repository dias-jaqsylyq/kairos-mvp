import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

type ProfileRow = {
  user_id: string;
  skills: string;
  interests: string;
  location: string | null;
  remote_pref: string | null;
  education: string | null;
  created_at: string;
};

const normalizeList = (value: unknown) =>
  typeof value === "string"
    ? value.split(",").map((v) => v.trim().toLowerCase()).filter(Boolean).join(",")
    : "";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("user_id");
  if (!userId) return NextResponse.json({ error: "no user_id" }, { status: 400 });

  const row = getDb()
    .prepare("SELECT * FROM profiles WHERE user_id = ?")
    .get(userId) as ProfileRow | undefined;

  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json(row);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const userId = body.user_id;
  if (!userId) return NextResponse.json({ error: "no user_id" }, { status: 400 });

  getDb().prepare(
    `INSERT INTO profiles (user_id, skills, interests, location, remote_pref, education)
     VALUES (@user_id, @skills, @interests, @location, @remote_pref, @education)
     ON CONFLICT(user_id) DO UPDATE SET
       skills = excluded.skills,
       interests = excluded.interests,
       location = excluded.location,
       remote_pref = excluded.remote_pref,
       education = excluded.education`
  ).run({
    user_id: userId,
    skills: normalizeList(body.skills),
    interests: normalizeList(body.interests),
    location: body.location ?? null,
    remote_pref: body.remote_pref ?? null,
    education: body.education ?? null,
  });

  return NextResponse.json({ ok: true });
}
