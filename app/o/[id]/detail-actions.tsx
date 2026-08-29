"use client";

import { useEffect } from "react";

type DetailActionsProps = {
  opportunityId: string;
  url: string;
};

function postEvent(
  userId: string,
  opportunityId: string,
  action: "view" | "apply_click"
) {
  fetch("/api/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      opportunity_id: opportunityId,
      action,
    }),
  });
}

export default function DetailActions({ opportunityId, url }: DetailActionsProps) {
  useEffect(() => {
    const userId = localStorage.getItem("kairos_user_id");
    if (userId) postEvent(userId, opportunityId, "view");
  }, [opportunityId]);

  function handleApplyClick() {
    const userId = localStorage.getItem("kairos_user_id");
    if (userId) postEvent(userId, opportunityId, "apply_click");
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleApplyClick}
      className="mt-2 w-fit rounded bg-white px-6 py-3 text-center text-lg font-semibold text-black"
    >
      Apply on Devpost
    </a>
  );
}
