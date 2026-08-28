"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const userId = localStorage.getItem("kairos_user_id");
    if (!userId) {
      router.replace("/profile");
      return;
    }

    fetch(`/api/profile?user_id=${userId}`).then((res) => {
      router.replace(res.ok ? "/feed" : "/profile");
    });
  }, [router]);

  return <div>Loading...</div>;
}
