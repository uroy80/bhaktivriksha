"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, ButtonLink, Field, Input } from "@/components/ui";

export function SetupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [setupCode, setSetupCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, setupCode }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Setup failed. Please try again.");
        setSubmitting(false);
        return;
      }
      setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="text-center">
        <span className="text-3xl">🎉</span>
        <h2 className="mt-3 text-lg font-bold text-saffron-950">Administrator created</h2>
        <p className="mt-2 text-sm text-saffron-900/70">
          The temple is ready. Sign in with your new admin account to begin.
        </p>
        <div className="mt-6">
          <ButtonLink href="/login" className="w-full">
            Sign in
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Your name">
        <Input
          name="name"
          required
          minLength={2}
          placeholder="Temple administrator"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      <Field label="Email">
        <Input
          type="email"
          name="email"
          autoComplete="email"
          required
          placeholder="admin@temple.org"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      <Field label="Password" hint="At least 8 characters.">
        <Input
          type="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      <Field label="Setup code" hint="The secret code configured on the server.">
        <Input
          type="password"
          name="setupCode"
          required
          placeholder="Setup code"
          value={setupCode}
          onChange={(e) => setSetupCode(e.target.value)}
        />
      </Field>

      {error ? (
        <p className="rounded-lg bg-maroon-50 px-3 py-2 text-sm font-medium text-maroon-700 ring-1 ring-maroon-200">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Creating…" : "Create admin account"}
      </Button>

      <p className="text-center text-xs text-saffron-900/50">
        Already set up?{" "}
        <Link href="/login" className="font-medium text-saffron-700 hover:text-saffron-800">
          Sign in
        </Link>
      </p>
    </form>
  );
}
