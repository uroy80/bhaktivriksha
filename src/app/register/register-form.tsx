"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button, Field, Input } from "@/components/ui";
import { Icon } from "@/components/icons";

export function RegisterForm({ joinToken, missionaryName }: { joinToken?: string; missionaryName?: string }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", whatsapp: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, joinToken }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "Could not create your account. Please try again.");
        setBusy(false);
        return;
      }
      // Auto sign-in straight into the sadhana app.
      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });
      if (result?.error) {
        router.push("/login");
        return;
      }
      router.push("/post-login");
    } catch {
      setError("Network error — please try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {missionaryName ? (
        <div className="flex items-center gap-2 rounded-lg bg-saffron-50 px-3 py-2.5 text-sm text-saffron-900 ring-1 ring-saffron-200">
          <Icon.invite className="h-4 w-4 shrink-0 text-saffron-600" />
          <span>
            You&apos;ll join <span className="font-semibold">{missionaryName}</span>&apos;s group after
            registering.
          </span>
        </div>
      ) : null}

      <Field label="Full name">
        <Input value={form.name} onChange={(e) => set("name", e.target.value)} required autoComplete="name" placeholder="Your name" />
      </Field>
      <Field label="Email">
        <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required autoComplete="email" placeholder="you@example.com" />
      </Field>
      <Field label="Password" hint="At least 8 characters.">
        <Input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} required autoComplete="new-password" placeholder="••••••••" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone (optional)">
          <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="tel" placeholder="+91…" />
        </Field>
        <Field label="WhatsApp (optional)">
          <Input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="+91…" />
        </Field>
      </div>

      {error ? (
        <p role="alert" className="rounded-lg bg-maroon-50 px-4 py-3 text-sm font-medium text-maroon-800 ring-1 ring-maroon-600/20">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={busy} className="w-full py-3 text-base" aria-busy={busy}>
        {busy ? "Creating your account…" : "Begin my sadhana"}
      </Button>

      {/* Google sign-in placeholder — wired once OAuth credentials are added. */}

      <p className="text-center text-sm text-saffron-900/70">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-saffron-700 hover:text-saffron-800">
          Sign in
        </Link>
      </p>
    </form>
  );
}
