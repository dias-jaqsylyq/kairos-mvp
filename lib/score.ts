import { ALIASES } from "./skills";
import type { Opportunity } from "./opportunities";

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

export function scoreOpportunity(p: Profile, o: Opportunity): Scored {
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

export function parseDeadlineDate(deadline: string | null): Date | null {
  if (!deadline) return null;
  const m = deadline.match(/([A-Z][a-z]{2})\s+(\d{1,2}),?\s+(\d{4})/g);
  const last = m?.[m.length - 1];
  if (!last) return null;
  const d = new Date(last);
  return isNaN(+d) ? null : d;
}

function daysUntil(deadline: string | null): number | null {
  const d = parseDeadlineDate(deadline);
  if (!d) return null;
  return Math.ceil((+d - Date.now()) / 86_400_000);
}

const clamp = (n: number) => Math.max(0, Math.min(100, n));
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
