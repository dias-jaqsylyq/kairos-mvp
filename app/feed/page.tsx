"use client";

import { useEffect, useState } from "react";

type FeedItem = {
  id: string;
  title: string;
  organizer: string;
  deadline: string | null;
  score: number;
  reason: string;
};

type EventAction = "view" | "save" | "dismiss" | "apply_click";

function postEvent(
  userId: string,
  item: FeedItem,
  position: number,
  action: EventAction
) {
  fetch("/api/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      opportunity_id: item.id,
      action,
      score: item.score,
      position,
    }),
  });
}

export default function FeedPage() {
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const userId = localStorage.getItem("kairos_user_id");
    const request = userId
      ? fetch(`/api/feed?user_id=${userId}`).then((res) =>
          res.ok ? res.json() : { items: [] }
        )
      : Promise.resolve({ items: [] });

    request.then((data) => {
      const fetchedItems: FeedItem[] = data.items ?? [];
      setItems(fetchedItems);

      if (userId) {
        fetchedItems.forEach((item, index) =>
          postEvent(userId, item, index + 1, "view")
        );
      }
    });
  }, []);

  if (items === null) return <div>Loading...</div>;

  if (items.length === 0) {
    return <div>No matches — try adding more skills</div>;
  }

  function handleSave(item: FeedItem, position: number) {
    const userId = localStorage.getItem("kairos_user_id");
    if (!userId) return;
    postEvent(userId, item, position, "save");
    setSavedIds((prev) => new Set(prev).add(item.id));
  }

  function handleDismiss(item: FeedItem, position: number) {
    const userId = localStorage.getItem("kairos_user_id");
    if (!userId) return;
    postEvent(userId, item, position, "dismiss");
    setItems((prev) => (prev ?? []).filter((i) => i.id !== item.id));
  }

  return (
    <div className="flex flex-col gap-4">
      {items.map((item, index) => (
        <div
          key={item.id}
          className="flex gap-4 rounded border border-white/10 p-4"
        >
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-white text-xl font-bold text-black">
            {item.score}
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <h2 className="font-semibold">{item.title}</h2>
            <p className="text-sm text-zinc-400">{item.organizer}</p>
            {item.deadline && (
              <span className="w-fit rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                {item.deadline}
              </span>
            )}
            <p className="text-sm text-zinc-300">{item.reason}</p>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => handleSave(item, index + 1)}
                disabled={savedIds.has(item.id)}
                className="rounded border border-white/20 px-3 py-1 text-sm disabled:opacity-50"
              >
                {savedIds.has(item.id) ? "Saved ✓" : "💾 Save"}
              </button>
              <button
                onClick={() => handleDismiss(item, index + 1)}
                className="rounded border border-white/20 px-3 py-1 text-sm"
              >
                ✕ Dismiss
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
