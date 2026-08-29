import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type EventAction = "view" | "save" | "dismiss" | "apply_click";
const VALID_ACTIONS: EventAction[] = ["view", "save", "dismiss", "apply_click"];

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { user_id, opportunity_id, action, score, position } = body;

  if (
    typeof user_id !== "string" ||
    typeof opportunity_id !== "string" ||
    !VALID_ACTIONS.includes(action)
  ) {
    return NextResponse.json({ error: "invalid event" }, { status: 400 });
  }

  db.prepare(
    `INSERT INTO events (user_id, opportunity_id, action, score, position)
     VALUES (?, ?, ?, ?, ?)`
  ).run(
    user_id,
    opportunity_id,
    action,
    typeof score === "number" ? score : null,
    typeof position === "number" ? position : null
  );

  return NextResponse.json({ success: true });
}
