import fs from "node:fs";
import path from "node:path";

export type Opportunity = {
  id: string; title: string; organizer: string; description: string;
  tags: string[]; location: string; isRemote: boolean;
  deadline: string | null; prize: string | null; url: string;
};

let cache: Opportunity[] | null = null;

export function getOpportunities(): Opportunity[] {
  if (cache) return cache;

  const file = path.join(process.cwd(), "data", "opportunities.json");
  cache = JSON.parse(fs.readFileSync(file, "utf-8"));
  return cache!;
}
