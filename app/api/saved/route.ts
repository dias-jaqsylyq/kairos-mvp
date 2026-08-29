import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getOpportunities } from "@/lib/opportunities";
import { parseDeadlineDate } from "@/lib/score";

type EventRow = {
  opportunity_id: string;
  action: string;
};

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("user_id");
  if (!userId) return NextResponse.json({ error: "no user_id" }, { status: 400 });

  const rows = getDb()
    .prepare(
      `SELECT opportunity_id, action FROM events
       WHERE user_id = ? AND action IN ('save', 'dismiss')
       ORDER BY created_at ASC, id ASC`
    )
    .all(userId) as EventRow[];

  // The most recent save/dismiss per opportunity wins, so a dismiss
  // after a save un-saves it.
  const latestAction = new Map<string, string>();
  for (const row of rows) latestAction.set(row.opportunity_id, row.action);

  const savedIds = new Set(
    [...latestAction.entries()]
      .filter(([, action]) => action === "save")
      .map(([opportunityId]) => opportunityId)
  );

  const items = getOpportunities()
    .filter((o) => savedIds.has(o.id))
    .sort((a, b) => deadlineSortKey(a.deadline) - deadlineSortKey(b.deadline));

  return NextResponse.json({ items });
}

function deadlineSortKey(deadline: string | null): number {
  const d = parseDeadlineDate(deadline);
  return d ? +d : Infinity; // no/unparsable deadline sorts last
}
