"use client";

import { useState } from "react";
import { Button, ButtonLink, Field, Input, Textarea } from "@/components/ui";

export function ApplyForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    whatsapp: "",
    address: "",
    message: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          // omit empty optionals so validation treats them as absent
          phone: form.phone.trim() || undefined,
          whatsapp: form.whatsapp.trim() || undefined,
          address: form.address.trim() || undefined,
          message: form.message.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not submit your application. Please try again.");
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
      <div className="py-6 text-center">
        <span className="text-4xl">🙏</span>
        <h2 className="mt-3 text-xl font-bold text-saffron-950">Application received</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-saffron-900/70">
          Hare Krishna! Thank you for applying. A counsellor will review your application soon —
          you can sign in any time to check your status.
        </p>
        <div className="mt-6">
          <ButtonLink href="/login">Sign in to check your status</ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name">
          <Input
            name="name"
            required
            minLength={2}
            placeholder="Your name"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            name="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </Field>
      </div>

      <Field label="Password" hint="At least 8 characters — you will use this to sign in.">
        <Input
          type="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="••••••••"
          value={form.password}
          onChange={(e) => set("password", e.target.value)}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone (optional)">
          <Input
            type="tel"
            name="phone"
            autoComplete="tel"
            placeholder="+91 98765 43210"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
        </Field>
        <Field label="WhatsApp (optional)">
          <Input
            type="tel"
            name="whatsapp"
            placeholder="+91 98765 43210"
            value={form.whatsapp}
            onChange={(e) => set("whatsapp", e.target.value)}
          />
        </Field>
      </div>

      <Field label="Address (optional)">
        <Textarea
          name="address"
          rows={2}
          maxLength={500}
          placeholder="Where do you live? This helps us connect you to a nearby group."
          value={form.address}
          onChange={(e) => set("address", e.target.value)}
        />
      </Field>

      <Field label="Why do you wish to join?">
        <Textarea
          name="message"
          rows={4}
          maxLength={2000}
          placeholder="Share a few words about your interest in Krishna consciousness…"
          value={form.message}
          onChange={(e) => set("message", e.target.value)}
        />
      </Field>

      {error ? (
        <p className="rounded-lg bg-maroon-50 px-3 py-2 text-sm font-medium text-maroon-700 ring-1 ring-maroon-200">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="w-full sm:w-auto" disabled={submitting}>
        {submitting ? "Submitting…" : "Submit application"}
      </Button>
    </form>
  );
}
