import { notFound } from "next/navigation";
import { getOpportunities } from "@/lib/opportunities";
import DetailActions from "./detail-actions";

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const opportunity = getOpportunities().find((o) => o.id === id);

  if (!opportunity) notFound();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{opportunity.title}</h1>
      <p className="text-zinc-400">{opportunity.organizer}</p>
      {opportunity.deadline && (
        <span className="w-fit rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
          {opportunity.deadline}
        </span>
      )}
      <p className="whitespace-pre-line text-zinc-200">{opportunity.description}</p>
      <DetailActions opportunityId={opportunity.id} url={opportunity.url} />
    </div>
  );
}
