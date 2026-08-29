"use client";

import { useEffect, useState } from "react";

type SavedItem = {
  id: string;
  title: string;
  organizer: string;
  deadline: string | null;
};

export default function SavedPage() {
  const [items, setItems] = useState<SavedItem[] | null>(null);

  useEffect(() => {
    const userId = localStorage.getItem("kairos_user_id");
    const request = userId
      ? fetch(`/api/saved?user_id=${userId}`).then((res) =>
          res.ok ? res.json() : { items: [] }
        )
      : Promise.resolve({ items: [] });

    request.then((data) => setItems(data.items ?? []));
  }, []);

  if (items === null) return <div>Loading...</div>;

  if (items.length === 0) {
    return <div>No saved items yet — save something from the feed</div>;
  }

  function handleUnsave(item: SavedItem) {
    const userId = localStorage.getItem("kairos_user_id");
    if (!userId) return;

    fetch("/api/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        opportunity_id: item.id,
        action: "dismiss",
      }),
    });

    setItems((prev) => (prev ?? []).filter((i) => i.id !== item.id));
  }

  return (
    <div className="flex flex-col gap-4">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-start justify-between gap-4 rounded border border-white/10 p-4"
        >
          <div className="flex flex-col gap-1">
            <h2 className="font-semibold">{item.title}</h2>
            <p className="text-sm text-zinc-400">{item.organizer}</p>
            {item.deadline && (
              <span className="w-fit rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                {item.deadline}
              </span>
            )}
          </div>
          <button
            onClick={() => handleUnsave(item)}
            className="rounded border border-white/20 px-3 py-1 text-sm"
          >
            Unsave
          </button>
        </div>
      ))}
    </div>
  );
}
