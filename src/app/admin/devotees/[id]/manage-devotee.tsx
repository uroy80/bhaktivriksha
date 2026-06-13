"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Select, Textarea } from "@/components/ui";

type LevelOption = { id: string; name: string; order: number };
type MentorOption = { id: string; name: string; role: "ADMIN" | "MISSIONARY" };

export type ManagedDevotee = {
  id: string;
  name: string;
  role: "ADMIN" | "MISSIONARY" | "DEVOTEE";
  status: "PENDING" | "ACTIVE" | "INACTIVE";
  mentorId: string | null;
  sadhanaLevelId: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  notes: string | null;
};

type Feedback = { section: string; ok: boolean; text: string };

export function ManageDevotee({
  devotee,
  menteeCount,
  levels,
  mentors,
}: {
  devotee: ManagedDevotee;
  menteeCount: number;
  levels: LevelOption[];
  mentors: MentorOption[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const [levelId, setLevelId] = useState(devotee.sadhanaLevelId ?? "");
  const [levelNote, setLevelNote] = useState("");
  const [mentorId, setMentorId] = useState(devotee.mentorId ?? "");
  const [phone, setPhone] = useState(devotee.phone ?? "");
  const [whatsapp, setWhatsapp] = useState(devotee.whatsapp ?? "");
  const [address, setAddress] = useState(devotee.address ?? "");
  const [notes, setNotes] = useState(devotee.notes ?? "");

  const isAdminTarget = devotee.role === "ADMIN";

  async function patch(section: string, body: Record<string, unknown>, okText: string) {
    setBusy(section);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/devotees/${devotee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setFeedback({ section, ok: false, text: data.error ?? "Something went wrong." });
        return;
      }
      setFeedback({ section, ok: true, text: okText });
      router.refresh();
    } catch {
      setFeedback({ section, ok: false, text: "Network error — please try again." });
    } finally {
      setBusy(null);
    }
  }

  function note(section: string) {
    if (!feedback || feedback.section !== section) return null;
    return (
      <p
        className={
          feedback.ok
            ? "mt-2 rounded-md bg-green-50 px-2.5 py-1.5 text-xs text-green-800"
            : "mt-2 rounded-md bg-maroon-50 px-2.5 py-1.5 text-xs text-maroon-800"
        }
        role={feedback.ok ? "status" : "alert"}
      >
        {feedback.text}
      </p>
    );
  }

  const sectionTitle = "text-sm font-semibold text-saffron-950";
  const divider = "border-t border-saffron-900/10 pt-4";

  return (
    <Card>
      <h2 className="mb-1 text-base font-semibold text-saffron-950">Manage Devotee</h2>
      <p className="mb-4 text-xs text-stone-500">Admin actions — every level change is audited.</p>

      <div className="space-y-4">
        {/* (a) Sadhana level */}
        <section>
          <h3 className={sectionTitle}>Sadhana level</h3>
          <div className="mt-2 space-y-2">
            <Select
              aria-label="Sadhana level"
              value={levelId}
              onChange={(e) => setLevelId(e.target.value)}
            >
              <option value="">— Choose a level —</option>
              {levels.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.order}. {l.name}
                </option>
              ))}
            </Select>
            <Input
              aria-label="Level note"
              placeholder="Optional note (e.g. completed standards)"
              value={levelNote}
              onChange={(e) => setLevelNote(e.target.value)}
              maxLength={1000}
            />
            <Button
              type="button"
              disabled={busy !== null || !levelId}
              onClick={() => {
                void patch(
                  "level",
                  { sadhanaLevelId: levelId, ...(levelNote.trim() ? { levelNote: levelNote.trim() } : {}) },
                  "Level updated and recorded in the history.",
                );
                setLevelNote("");
              }}
            >
              {busy === "level" ? "Saving…" : "Update level"}
            </Button>
          </div>
          {note("level")}
        </section>

        {/* (b) Mentor */}
        {!isAdminTarget && (
          <section className={divider}>
            <h3 className={sectionTitle}>Mentor</h3>
            <div className="mt-2 space-y-2">
              <Select
                aria-label="Mentor"
                value={mentorId}
                onChange={(e) => setMentorId(e.target.value)}
              >
                <option value="">— No mentor (unassigned) —</option>
                {mentors.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role === "ADMIN" ? "Admin" : "Missionary"})
                  </option>
                ))}
              </Select>
              <Button
                type="button"
                variant="secondary"
                disabled={busy !== null}
                onClick={() =>
                  void patch("mentor", { mentorId: mentorId || null }, "Mentor updated.")
                }
              >
                {busy === "mentor" ? "Saving…" : "Assign mentor"}
              </Button>
            </div>
            {note("mentor")}
          </section>
        )}

        {/* (c) Role */}
        {!isAdminTarget && (
          <section className={divider}>
            <h3 className={sectionTitle}>Role</h3>
            {devotee.role === "DEVOTEE" ? (
              <div className="mt-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy !== null}
                  onClick={() =>
                    void patch("role", { role: "MISSIONARY" }, "Promoted to missionary.")
                  }
                >
                  {busy === "role" ? "Saving…" : "Promote to Missionary"}
                </Button>
                <p className="mt-1.5 text-xs text-stone-500">
                  Missionaries can conduct sessions and mentor devotees.
                </p>
              </div>
            ) : (
              <div className="mt-2">
                <Button
                  type="button"
                  variant="danger"
                  disabled={busy !== null || menteeCount > 0}
                  onClick={() => void patch("role", { role: "DEVOTEE" }, "Demoted to devotee.")}
                >
                  {busy === "role" ? "Saving…" : "Demote to Devotee"}
                </Button>
                {menteeCount > 0 ? (
                  <p className="mt-1.5 text-xs text-maroon-700">
                    Cannot demote while they mentor {menteeCount}{" "}
                    {menteeCount === 1 ? "person" : "people"} — reassign their mentees first.
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs text-stone-500">They have no mentees.</p>
                )}
              </div>
            )}
            {note("role")}
          </section>
        )}

        {/* (d) Status */}
        {!isAdminTarget && (
          <section className={divider}>
            <h3 className={sectionTitle}>Status</h3>
            <p className="mt-1 text-xs text-stone-500">
              Currently <span className="font-semibold">{devotee.status}</span>. Inactive users
              cannot sign in.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {devotee.status !== "ACTIVE" && (
                <Button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void patch("status", { status: "ACTIVE" }, "Marked active.")}
                >
                  {busy === "status" ? "Saving…" : "Set Active"}
                </Button>
              )}
              {devotee.status !== "INACTIVE" && (
                <Button
                  type="button"
                  variant="danger"
                  disabled={busy !== null}
                  onClick={() => void patch("status", { status: "INACTIVE" }, "Marked inactive.")}
                >
                  {busy === "status" ? "Saving…" : "Set Inactive"}
                </Button>
              )}
            </div>
            {note("status")}
          </section>
        )}

        {/* Contact + notes */}
        <section className={divider}>
          <h3 className={sectionTitle}>Contact &amp; notes</h3>
          <div className="mt-2 space-y-2">
            <Input
              aria-label="Phone"
              placeholder="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Input
              aria-label="WhatsApp"
              placeholder="WhatsApp"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
            />
            <Textarea
              aria-label="Address"
              placeholder="Address"
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              maxLength={500}
            />
            <Textarea
              aria-label="Private notes"
              placeholder="Private notes (visible to superiors only)"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={2000}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={busy !== null}
              onClick={() =>
                void patch(
                  "contact",
                  { phone, whatsapp, address, notes },
                  "Contact details saved.",
                )
              }
            >
              {busy === "contact" ? "Saving…" : "Save details"}
            </Button>
          </div>
          {note("contact")}
        </section>
      </div>
    </Card>
  );
}
