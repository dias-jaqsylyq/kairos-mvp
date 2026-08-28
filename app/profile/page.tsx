"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type RemotePref = "remote" | "onsite" | "any";

export default function ProfilePage() {
  const router = useRouter();
  const userIdRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [skills, setSkills] = useState("");
  const [interests, setInterests] = useState("");
  const [location, setLocation] = useState("");
  const [remotePref, setRemotePref] = useState<RemotePref>("any");
  const [education, setEducation] = useState("");

  useEffect(() => {
    let id = localStorage.getItem("kairos_user_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("kairos_user_id", id);
    }
    userIdRef.current = id;

    fetch(`/api/profile?user_id=${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((profile) => {
        if (profile) {
          setSkills(profile.skills ?? "");
          setInterests(profile.interests ?? "");
          setLocation(profile.location ?? "");
          setRemotePref((profile.remote_pref as RemotePref) ?? "any");
          setEducation(profile.education ?? "");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const userId = userIdRef.current;
    if (!userId) return;
    setSubmitting(true);

    await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        skills,
        interests,
        location,
        remote_pref: remotePref,
        education,
      }),
    });

    router.push("/feed");
  }

  if (loading) return <div>Loading...</div>;

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex w-full max-w-md flex-col gap-4 p-6"
    >
      <h1 className="text-xl font-semibold">Your profile</h1>

      <label className="flex flex-col gap-1">
        Skills
        <input
          type="text"
          value={skills}
          onChange={(e) => setSkills(e.target.value)}
          placeholder="react, python, figma"
          className="rounded border px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1">
        Interests
        <input
          type="text"
          value={interests}
          onChange={(e) => setInterests(e.target.value)}
          placeholder="ai, web3, design"
          className="rounded border px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1">
        Location
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Almaty"
          className="rounded border px-3 py-2"
        />
      </label>

      <fieldset className="flex flex-col gap-1">
        <legend>Remote preference</legend>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="remote_pref"
            value="remote"
            checked={remotePref === "remote"}
            onChange={() => setRemotePref("remote")}
          />
          Remote
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="remote_pref"
            value="onsite"
            checked={remotePref === "onsite"}
            onChange={() => setRemotePref("onsite")}
          />
          On-site
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="remote_pref"
            value="any"
            checked={remotePref === "any"}
            onChange={() => setRemotePref("any")}
          />
          Any
        </label>
      </fieldset>

      <label className="flex flex-col gap-1">
        Education level
        <select
          value={education}
          onChange={(e) => setEducation(e.target.value)}
          className="rounded border px-3 py-2"
        >
          <option value="">Select...</option>
          <option value="High School">High School</option>
          <option value="Bachelor">Bachelor</option>
          <option value="Master">Master</option>
          <option value="PhD">PhD</option>
          <option value="Other">Other</option>
        </select>
      </label>

      <button
        type="submit"
        disabled={submitting}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        {submitting ? "Saving..." : "Save profile"}
      </button>
    </form>
  );
}
