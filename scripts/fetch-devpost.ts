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
