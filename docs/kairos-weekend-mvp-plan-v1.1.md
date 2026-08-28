# Kairos — Weekend MVP Plan

**Version 1.1** · **Goal:** ship a working, publicly reachable prototype in 16 hours (Sat 29 + Sun 30 August 2026, 8 hrs/day) and put it in front of 5 real users.

**Hypothesis under test:** *users will find value in a personalized feed of opportunities ranked by relevance.*

**What this MVP can and cannot prove.** With keyword matching instead of an LLM ranker, this tests whether a single, deadline-aware, personally-filtered list beats the user's current tab-checking habit. That is the more fundamental half of the thesis and it is worth testing first. What it cannot prove is that *AI* ranking specifically adds value — if users like this, the AI layer is still unvalidated; if they dislike it, the cause may be crude matching rather than the concept. Interpret results accordingly and record which it was.

**The one rule for the weekend:** if something takes longer than its slot, cut it and move on. A finished ugly product tested by 5 users is the deliverable. An unfinished elegant one is worth nothing on Monday.

---

## 1. Scope

### In (P0 for the weekend)

| # | Feature | Why it's in |
|---|---|---|
| 1 | Profile form — skills, location/remote, education level | The input the whole hypothesis depends on |
| 2 | One data source: Devpost hackathons, fetched once into a static JSON file | Real data, zero runtime failure modes |
| 3 | Keyword scoring, 0–100, with a one-line reason | This *is* the hypothesis |
| 4 | Ranked feed, 20 cards | The thing being tested |
| 5 | Save / Dismiss | Behavioural signal, not just opinion |
| 6 | Detail view + outbound apply link | Closes the loop |
| 7 | Event logging (view / save / dismiss / apply-click) | The actual output of the weekend |

### Out (explicitly, without regret)

Auth, email, GDPR, PWA, accessibility audit, light theme, i18n, LLM ranking, embeddings, eligibility extraction, deduplication, multi-source ingestion, cron jobs, admin panel, referrals, Curator's Picks, Guaranteed Fit Floor, saved-status transitions, filters, search, tests.

**Identity without auth:** on first visit, generate a UUID, store it in `localStorage`, send it with every request. Five testers, five UUIDs, zero auth code. Tell testers not to clear their browser data during the test.

### Known limitation to state out loud

Devpost alone means the feed is hackathons only. Your personas came for internships and scholarships too, so a hackathon-only feed tests the idea on its narrowest slice. If Sunday runs ahead of schedule (Hour 12), spend 30 minutes adding a second static source (the SimplifyJobs internship repo JSON) — it needs no new code beyond one more normalizer function. If it runs behind, ship hackathons only and tell testers what they're looking at.

---

## 2. Pre-weekend preparation (Friday evening)

Two dependencies can wreck the weekend, and both are outside your code: a third-party API you don't control, and a deployment target whose persistence you haven't verified. Neither belongs on Saturday's critical path. Clear them on Friday.

**Budget: 15 minutes if everything works, 45 if it doesn't — and discovering which is exactly the point.** Do this Friday, not Saturday at 9am.

1. **Scaffold and push.** `npx create-next-app@latest kairos-mvp --typescript --tailwind --app`, then push to GitHub. Nothing else — the default page is all you need tonight.
2. **Deploy to Railway and verify the volume.** Follow the Railway checklist in §3 in full, including the persistence test. Do not skip the test on the grounds that the volume "should" work.
3. **Run the fetch script once.** Write and run `scripts/fetch-devpost.ts` (§6.1). Commit `data/opportunities.json` to the repo.
4. **Read ten entries by hand.** Open the JSON and verify that ten randomly chosen entries have a real title, a plausible organizer, and a deadline string your parser can read. Do this with your eyes, not with code.
5. **Fix the mapping now if Devpost's format has shifted.** Their endpoint is unofficial and undocumented; field names change without notice. Adjusting the mapping on Friday costs twenty minutes. Discovering it on Saturday morning costs an hour and your momentum.

**What this buys you:** Saturday Hour 1 becomes "confirm the file has 150+ items and start writing product code" rather than "debug someone else's undocumented API." The external dependency is now a static file in your repo that cannot fail during the demo.

If step 3 yields fewer than 100 opportunities, stop and fix it Friday. A thin catalogue makes every subsequent hour pointless — you cannot test ranking on 40 items.

---

## 3. Stack

| Layer | Choice | Why |
|---|---|---|
| App | **Next.js 15 (App Router) + TypeScript** | One project, pages and API routes together, one deploy |
| Styling | **Tailwind** (comes with `create-next-app`) | No design decisions to make |
| Data — opportunities | **Static JSON file** in the repo, generated once by a script | No DB reads, no fetch failures, no rate limits during the demo |
| Data — profiles, saves, events | **SQLite via `better-sqlite3`**, WAL mode | One file, synchronous API, no ORM, no migrations |
| Hosting | **Railway** with a persistent volume mounted at `/data` | Vercel's filesystem is read-only — SQLite will silently lose writes there. This trap has eaten many weekend projects |
| Alternative | Vercel + Turso (`@libsql/client`) | If you'd rather deploy on Vercel; it's a one-file swap in `lib/db.ts`. The WAL pragmas below are SQLite-local and don't apply |

No auth library, no state manager, no component library, no ORM.

### Railway deployment checklist (execute Friday evening, before Hour 1)

1. Create the project and connect your GitHub repo.
2. Add a **persistent volume** with mount path `/data`.
3. Set the environment variable **`DB_PATH=/data/kairos.db`**. This is the single most commonly forgotten step, and forgetting it fails silently — the app writes to an ephemeral path, everything works in testing, and every save vanishes on the next deploy.
4. Deploy the default page first and confirm it loads.
5. **Test the volume for real.** Add a temporary API route that writes a file to `/data/test.txt`, hit it, then redeploy and hit a second route that reads the file back. If it's gone, the volume is misconfigured — fix it now, delete both routes afterwards. Ten minutes on Friday against an hour of Sunday-evening panic.

**Local development fallback:** the code uses `process.env.DB_PATH ?? "./kairos.db"`, so running locally writes to the project root without any setup. The fallback is safe for development and dangerous in production — if you ever see a `kairos.db` file appear next to your source on the server, `DB_PATH` isn't set.

---

## 4. Files to create

```
kairos-mvp/
├── scripts/
│   ├── fetch-devpost.ts        # run ONCE (Friday), writes data/opportunities.json
│   └── score-test.ts           # CLI scoring debugger — keep it, you'll use it all weekend
├── data/
│   └── opportunities.json      # committed to the repo
├── lib/
│   ├── db.ts                   # sqlite connection, WAL, schema bootstrap
│   ├── opportunities.ts        # loads + caches the JSON
│   ├── score.ts                # THE core logic
│   └── skills.ts               # skill alias map
├── app/
│   ├── layout.tsx
│   ├── page.tsx                # redirect: profile if none, else /feed
│   ├── profile/page.tsx        # the form
│   ├── feed/page.tsx           # ranked feed (client component)
│   ├── o/[id]/page.tsx         # detail view
│   ├── saved/page.tsx          # saved list
│   └── api/
│       ├── profile/route.ts    # GET/POST profile
│       ├── feed/route.ts       # GET scored + sorted feed
│       └── event/route.ts      # POST save|dismiss|apply_click|view
└── .env                        # DB_PATH=/data/kairos.db
```

Fourteen files. If you find yourself creating a fifteenth, ask whether it's in the scope table above.

---

## 5. Hour-by-hour

The hours below assume §2 is done. Friday's preparation frees roughly an hour of Saturday, which is spent moving Save/Dismiss forward from Sunday — the feature that turns opinion into behavioural data, and therefore the one you least want stuck behind a late-Sunday scramble.

### Saturday (hours 1–8)

**Hour 1 — Data check, database, profile API.** Confirm `data/opportunities.json` exists and holds 150+ items with valid deadlines (two minutes — you already read it Friday). Write `lib/db.ts` with the WAL pragmas and schema (§6.2), and `lib/opportunities.ts`. Then `app/api/profile/route.ts`: POST upserts by `user_id`, GET reads. Test both with `curl` before touching any UI.

**Hour 2 — Profile form.** `app/profile/page.tsx`: skills (comma-separated text input — not a tag component), interests (same), location (text), remote preference (radio), education level (select). On submit, POST and redirect to `/feed`. Generate the UUID in `localStorage` here.

**Hours 3–4 — The matching logic.** `lib/skills.ts` and `lib/score.ts` (§6.3, §6.4). Then run `npx tsx scripts/score-test.ts` (§6.5) against three profiles: a React student, an ML student, a designer. **Read the output yourself.** If the top 5 for the React profile is not obviously more React-ish than for the ML profile, fix the scoring now. This is the product; do not rush it to get to the UI. Every alias you add to `skills.ts` here pays off five times over during the user test.

**Hours 5–6 — The feed.** `app/api/feed/route.ts` scores everything and returns the top 20 minus dismissed items (§6.6). `app/feed/page.tsx` renders cards: score badge, title, organizer, deadline chip, the one-line reason, Save and Dismiss buttons. Plain, dense, dark. Stop when it works, not when it's pretty.

**Hour 7 — Save / Dismiss.** `app/api/event/route.ts` writes to the `events` table. Buttons call it optimistically; dismissed items disappear from the feed immediately. Every event row is data you will read on Monday, so get `score` and `position` into every write.

**Hour 8 — Mid-build deploy and buffer.** Push, deploy, run the full flow on the live URL: profile → feed → save → refresh → the save persisted. Anything broken here is a Saturday problem with Sunday still available. Use whatever's left as buffer, because hours 1–7 will have overrun somewhere.

**End of Saturday you should have:** a deployed URL where you can fill a form, see a ranked list, and save items that survive a page reload. If you don't, cut the saved list from Sunday and finish this first.

### Sunday (hours 9–16)

**Hour 9 — Detail view.** `app/o/[id]/page.tsx`: title, organizer, full description, deadline, score, reason, and a large outbound "Apply on Devpost" link that fires an `apply_click` event before navigating.

**Hour 10 — Saved list.** `app/saved/page.tsx`: items with a `save` event and no later `dismiss`, sorted by deadline. Twenty minutes of work; it's the thing that makes the product feel like a tool rather than a list.

**Hour 11 — Minimum viable polish.** Empty state on the feed ("No matches — try adding more skills"), a header with three links (Feed / Saved / Edit profile), a loading state, mobile-width check on your phone. Nothing else.

**Hour 12 — Second source, or buffer.** If everything above is done and deployed, add the SimplifyJobs internship JSON as a second static file with its own normalizer — one function, same schema, and the feed picks it up for free. This is the highest-value optional hour in the plan, because it removes the "this is only hackathons" objection from your user test. If you're behind, skip it without hesitation and use the hour to finish Hour 11.

**Hour 13 — Adversarial self-test.** Create five profiles matching your five real testers as closely as you can guess, and run each through `scripts/score-test.ts`. Fix only the most embarrassing failures — usually a skill that matches nothing (add an alias) or one enormous hackathon dominating every feed (cap its score contribution). Resist rewriting the scorer.

**Hour 14 — Deploy and smoke-test.** Push, deploy, then run the whole flow on your phone on mobile data with a fresh browser profile. Fix what breaks. Confirm the SQLite file survived the redeploy — you tested this Friday, verify it again with real data in it.

**Hours 15–16 — Test prep and buffer.** Write the interview script (§7), prepare a scoring sheet, message the five testers with a time slot.

---

## 6. Core code

### 6.1 `scripts/fetch-devpost.ts`

```ts
import fs from "node:fs";

type Opportunity = {
  id: string; title: string; organizer: string; description: string;
  tags: string[]; location: string; isRemote: boolean;
  deadline: string | null; prize: string | null; url: string;
};

async function main() {
  const out: Opportunity[] = [];

  for (let page = 1; page <= 5; page++) {
    const res = await fetch(`https://devpost.com/api/hackathons?page=${page}`, {
      headers: { "User-Agent": "kairos-mvp/0.1 (weekend prototype)" },
    });
    if (!res.ok) { console.error(`page ${page}: ${res.status}`); break; }
    const json: any = await res.json();

    for (const h of json.hackathons ?? []) {
      const themes: string[] = (h.themes ?? []).map((t: any) => t.name);
      out.push({
        id: String(h.id),
        title: h.title ?? "",
        organizer: h.organization_name ?? "Devpost",
        // submission_period_dates is a human string like "Sep 01 - Oct 15, 2026"
        description: [h.tagline ?? "", themes.join(", ")].filter(Boolean).join(" — "),
        tags: themes,
        location: h.displayed_location?.location ?? "Online",
        isRemote: /online/i.test(h.displayed_location?.location ?? ""),
        deadline: h.submission_period_dates ?? null,
        prize: h.prize_amount
          ? String(h.prize_amount).replace(/<[^>]+>/g, "")
          : null,
        url: h.url?.startsWith("http") ? h.url : `https://devpost.com${h.url ?? ""}`,
      });
    }
    await new Promise((r) => setTimeout(r, 1500)); // be polite
  }

  const seen = new Set<string>();
  const deduped = out.filter((o) => o.title && !seen.has(o.id) && seen.add(o.id));

  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync("data/opportunities.json", JSON.stringify(deduped, null, 2));
  console.log(`wrote ${deduped.length} opportunities`);
}

main();
```

> The exact field names in Devpost's response may differ. Spend five minutes with `curl` on page 1 before writing the mapping, and adjust. Do not spend an hour making the parser robust — you run it once, on Friday.

### 6.2 `lib/db.ts`

```ts
import Database from "better-sqlite3";

export const db = new Database(process.env.DB_PATH ?? "./kairos.db");

// WAL lets readers and writers work concurrently; the default journal mode
// takes a lock that can reject a write while a read is in flight.
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA synchronous = NORMAL;");

// Verify it actually engaged — some network filesystems silently refuse WAL
// and fall back to 'delete'. Check the log line on first boot.
console.log("journal_mode:", db.pragma("journal_mode", { simple: true }));

db.exec(`
  CREATE TABLE IF NOT EXISTS profiles (
    user_id     TEXT PRIMARY KEY,
    skills      TEXT NOT NULL,      -- comma-separated, lowercased
    interests   TEXT NOT NULL,
    location    TEXT,
    remote_pref TEXT,               -- 'remote' | 'onsite' | 'any'
    education   TEXT,
    created_at  TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS events (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id        TEXT NOT NULL,
    opportunity_id TEXT NOT NULL,
    action         TEXT NOT NULL,   -- view | save | dismiss | apply_click
    score          INTEGER,         -- the score shown at the time
    position       INTEGER,         -- rank in the feed, 1-based
    created_at     TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);
```

Storing `score` and `position` on every event is what lets you compute precision@10 on Monday instead of guessing.

### 6.3 `lib/score.ts` — the core matching logic

```ts
import { ALIASES } from "./skills";

export type Profile = {
  skills: string[]; interests: string[];
  location: string; remotePref: "remote" | "onsite" | "any";
  education: string;
};

export type Scored = { score: number; reason: string };

const expand = (term: string): string[] => {
  const t = term.trim().toLowerCase();
  return [t, ...(ALIASES[t] ?? [])];
};

// word-boundary match so "r" doesn't match "react" and "go" doesn't match "google"
const mentions = (haystack: string, term: string) =>
  new RegExp(`(^|[^a-z0-9+#])${escapeRe(term)}([^a-z0-9+#]|$)`, "i").test(haystack);

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function scoreOpportunity(p: Profile, o: any): Scored {
  const text = `${o.title} ${o.description} ${(o.tags ?? []).join(" ")}`.toLowerCase();
  const reasons: string[] = [];

  // 1. Skill overlap — up to 50 points. The dominant signal, deliberately.
  const hitSkills = p.skills.filter((s) =>
    expand(s).some((v) => mentions(text, v))
  );
  const skillPts =
    p.skills.length === 0
      ? 0
      : Math.min(50, Math.round((hitSkills.length / p.skills.length) * 50) + (hitSkills.length ? 10 : 0));
  if (hitSkills.length) reasons.push(`matches ${hitSkills.slice(0, 3).join(", ")}`);

  // 2. Interests — up to 20 points.
  const hitInterests = p.interests.filter((i) =>
    expand(i).some((v) => mentions(text, v))
  );
  const interestPts = Math.min(20, hitInterests.length * 10);
  if (hitInterests.length && !hitSkills.length)
    reasons.push(`in ${hitInterests[0]}`);

  // 3. Location / remote fit — up to 15 points.
  let locPts = 0;
  if (o.isRemote && (p.remotePref === "remote" || p.remotePref === "any")) {
    locPts = 15;
    reasons.push("online");
  } else if (p.location && mentions(`${o.location}`.toLowerCase(), p.location.toLowerCase())) {
    locPts = 15;
    reasons.push(`in ${o.location}`);
  } else if (p.remotePref === "remote" && !o.isRemote) {
    locPts = -10; // penalty: wrong shape entirely
  }

  // 4. Deadline urgency — up to 15 points. Soon-but-not-tomorrow ranks highest.
  const days = daysUntil(o.deadline);
  let deadlinePts = 0;
  if (days !== null) {
    if (days < 0) return { score: 0, reason: "closed" };   // expired: drop it
    else if (days <= 3) deadlinePts = 8;
    else if (days <= 30) deadlinePts = 15;
    else if (days <= 90) deadlinePts = 8;
    else deadlinePts = 3;
    if (days <= 7) reasons.push(`closes in ${days}d`);
  }

  const score = clamp(skillPts + interestPts + locPts + deadlinePts);
  const reason = reasons.length
    ? capitalize(reasons.slice(0, 3).join(" · "))
    : "General match on your interests";

  return { score, reason };
}

function daysUntil(deadline: string | null): number | null {
  if (!deadline) return null;
  const m = deadline.match(/([A-Z][a-z]{2})\s+(\d{1,2}),?\s+(\d{4})/g);
  const last = m?.[m.length - 1];
  if (!last) return null;
  const d = new Date(last);
  if (isNaN(+d)) return null;
  return Math.ceil((+d - Date.now()) / 86_400_000);
}

const clamp = (n: number) => Math.max(0, Math.min(100, n));
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
```

### 6.4 `lib/skills.ts`

```ts
// Without aliases, a user who types "react" misses every listing that says
// "React.js" or "Next.js". This map is the cheapest quality win available.
export const ALIASES: Record<string, string[]> = {
  react: ["react.js", "reactjs", "next.js", "nextjs"],
  javascript: ["js", "typescript", "ts", "node", "node.js"],
  python: ["py", "django", "flask", "fastapi"],
  ml: ["machine learning", "deep learning", "pytorch", "tensorflow"],
  ai: ["artificial intelligence", "llm", "genai", "generative ai"],
  design: ["ui", "ux", "figma", "product design"],
  mobile: ["ios", "android", "react native", "flutter", "swift", "kotlin"],
  web3: ["blockchain", "solidity", "ethereum", "crypto"],
  data: ["data science", "analytics", "sql", "pandas"],
  cloud: ["aws", "gcp", "azure", "kubernetes", "docker"],
};
```

Add aliases for whatever your five testers actually type. That is a two-minute fix with a large effect on their experience.

### 6.5 `scripts/score-test.ts` — the scoring debugger

```ts
// Run with: npx tsx scripts/score-test.ts
// Input example: "react,javascript,typescript"
// Outputs top 5 matches for the given skills.

import fs from "node:fs";
import readline from "node:readline";
import { scoreOpportunity } from "../lib/score";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const opportunities = JSON.parse(
  fs.readFileSync("data/opportunities.json", "utf-8")
);

rl.question("Enter skills (comma-separated): ", (skillsInput) => {
  const skills = skillsInput.split(",").map((s) => s.trim().toLowerCase());
  const profile = {
    skills,
    interests: [],
    location: "",
    remotePref: "any" as const,
    education: "",
  };

  const scored = opportunities
    .map((o: any) => ({ ...o, ...scoreOpportunity(profile, o) }))
    .filter((o: any) => o.score > 0)
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, 5);

  scored.forEach((o: any, i: number) => {
    console.log(`${i + 1}. [${o.score}] ${o.title} — ${o.reason}`);
  });

  rl.close();
});
```

This is not throwaway code. It's your entire feedback loop on the only component that matters, it runs in under a second without a browser or a server, and you'll reach for it again in Hour 13 and after every alias you add. Keep it in the repo.

### 6.6 `app/api/feed/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOpportunities } from "@/lib/opportunities";
import { scoreOpportunity } from "@/lib/score";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("user_id");
  if (!userId) return NextResponse.json({ error: "no user_id" }, { status: 400 });

  const row: any = db.prepare("SELECT * FROM profiles WHERE user_id = ?").get(userId);
  if (!row) return NextResponse.json({ error: "no profile" }, { status: 404 });

  const profile = {
    skills: split(row.skills),
    interests: split(row.interests),
    location: row.location ?? "",
    remotePref: row.remote_pref ?? "any",
    education: row.education ?? "",
  };

  const dismissed = new Set(
    db.prepare("SELECT opportunity_id FROM events WHERE user_id = ? AND action = 'dismiss'")
      .all(userId).map((r: any) => r.opportunity_id)
  );

  const items = getOpportunities()
    .filter((o) => !dismissed.has(o.id))
    .map((o) => ({ ...o, ...scoreOpportunity(profile, o) }))
    .filter((o) => o.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  return NextResponse.json({ items });
}

const split = (s: string) =>
  s.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
```

Scoring 250 items in memory takes under a millisecond. No caching, no queue, no worker — the entire asynchronous architecture in the full PDD exists only because of the LLM call, and there isn't one here.

---

## 7. Testing with 5 users

Book five 20-minute slots, in person or over a call with screen share. Recruit people who are *currently* looking for something — a student between applications will tell you nothing useful.

**Setup (2 min).** "This is a rough prototype I built this weekend. It only covers hackathons right now. Be blunt — I'd rather hear it's useless now than in three months."

**Task 1 — Profile (3 min).** They fill the form themselves while you watch silently. Note every hesitation and every skill they type that you have no alias for. Do not help.

**Task 2 — The measurement (7 min).** They open the feed. Ask them to go through the top 10 and say, for each: *would you actually open this?* Record yes/no in a sheet. **Yes-count ÷ 10 is your precision@10.** This single number is the point of the entire weekend.

**Task 3 — Behaviour (3 min).** "Save the ones you're interested in, dismiss the rest." Say nothing while they do it. The event log now has their real behaviour, which you compare against what they said in Task 2.

**Questions (5 min).**
1. Where do you look for these things today, and how long does it take you per week?
2. Would you check this weekly? What would make you stop?
3. What's missing that would make you use it instead of what you do now?
4. Two of the top ten were wrong — why, specifically?
5. If this covered internships and scholarships too, would you use it? *(Ask last. It reveals whether hackathon-only was the limiting factor.)*

**Do not** demo the product yourself, explain why a bad match appeared, or defend the ranking. The instinct to explain will be strong; every time you give in you contaminate the result.

### Reading the result

| Signal | Reading |
|---|---|
| Average precision@10 ≥ 6/10 **and** ≥3 users say they'd check weekly | The concept holds. Build the real ingestion layer next, not the LLM ranker — coverage is the complaint you'll hear |
| Precision 4–6/10 but strong "yes, if it had internships too" | The concept holds; the source is the problem. Add sources before touching the scorer |
| Precision ≥ 6/10 but nobody would return weekly | Ranking works, the return-trigger problem is real. This is what the email digest is for |
| Precision < 4/10 across the board | Either matching or catalogue. Check whether their skills matched *anything* in your data before concluding the idea is wrong |
| Everyone is polite and nobody saves anything | The behavioural log is the truth, not the interview. Treat this as a negative result |

Write up all five sessions the same evening, while you still remember the hesitations. Two pages, no formatting. That document, plus the precision number, is what makes the decision about the next six weeks — and it is far better evidence than anything in a pitch deck.
