"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export function JoinButton({ token, missionaryName }: { token: string; missionaryName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function join() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "Could not join. Please try again.");
        setBusy(false);
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/devotee"), 1200);
    } catch {
      setError("Network error — please try again.");
      setBusy(false);
    }
  }

  if (done) {
    return (
      <p className="rounded-lg bg-green-50 px-4 py-3 text-center text-sm font-medium text-green-800 ring-1 ring-green-600/20">
        Welcome to {missionaryName}&apos;s group! Taking you to your dashboard…
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <Button onClick={join} disabled={busy} className="w-full py-3 text-base" aria-busy={busy}>
        {busy ? "Joining…" : `Join ${missionaryName}'s group`}
      </Button>
      {error ? (
        <p role="alert" className="rounded-lg bg-maroon-50 px-4 py-3 text-center text-sm font-medium text-maroon-800 ring-1 ring-maroon-600/20">
          {error}
        </p>
      ) : null}
    </div>
  );
}
