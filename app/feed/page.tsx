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

export default function FeedPage() {
  const [items, setItems] = useState<FeedItem[] | null>(null);

  useEffect(() => {
    const userId = localStorage.getItem("kairos_user_id");
    const request = userId
      ? fetch(`/api/feed?user_id=${userId}`).then((res) =>
          res.ok ? res.json() : { items: [] }
        )
      : Promise.resolve({ items: [] });

    request.then((data) => setItems(data.items ?? []));
  }, []);

  if (items === null) return <div>Loading...</div>;

  if (items.length === 0) {
    return <div>No matches — try adding more skills</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex gap-4 rounded border border-white/10 p-4"
        >
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-white text-xl font-bold text-black">
            {item.score}
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="font-semibold">{item.title}</h2>
            <p className="text-sm text-zinc-400">{item.organizer}</p>
            {item.deadline && (
              <span className="w-fit rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                {item.deadline}
              </span>
            )}
            <p className="text-sm text-zinc-300">{item.reason}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
