import type { Metadata } from "next";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { requireRole } from "@/lib/guards";
import { getOrCreateInviteToken } from "@/lib/invite";
import { Card, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icons";
import { CopyLink } from "./copy-link";

export const metadata: Metadata = { title: "Invite QR" };

export default async function InvitePage() {
  const user = await requireRole("MISSIONARY", "ADMIN");
  const token = await getOrCreateInviteToken(user);

  // Build an absolute URL from the request (works behind proxies / Cloudflare).
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const joinUrl = `${proto}://${host}/join/${token}`;

  const qrSvg = await QRCode.toString(joinUrl, {
    type: "svg",
    margin: 1,
    color: { dark: "#7f3210", light: "#ffffff" }, // saffron-900 on white
    errorCorrectionLevel: "M",
  });

  const steps = [
    "Show this QR at satsanga, or share the link on WhatsApp.",
    "A devotee scans it (or taps the link) and creates an account.",
    "They're placed in your group instantly — ready for you to guide.",
  ];

  return (
    <div>
      <PageHeader
        title="Your invite QR"
        subtitle="Devotees who scan this join your group automatically — no admin step needed."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="flex flex-col items-center p-8 text-center">
          <div
            className="w-full max-w-[280px] rounded-2xl bg-white p-4 shadow-sm ring-1 ring-saffron-900/10 [&>svg]:h-auto [&>svg]:w-full"
            // qrcode emits a self-contained, static SVG string
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          <p className="mt-4 text-sm font-semibold text-saffron-950">{user.name}&apos;s group</p>
          <p className="text-xs text-saffron-900/60">Bhakti Vriksha · Sadhana Companion</p>
        </Card>

        <div className="space-y-6">
          <Card>
            <h2 className="font-semibold text-saffron-950">Share your link</h2>
            <p className="mt-1 mb-4 text-xs text-saffron-900/60">
              Anyone who opens this link can join your group.
            </p>
            <CopyLink url={joinUrl} />
          </Card>

          <Card>
            <h2 className="font-semibold text-saffron-950">How it works</h2>
            <ol className="mt-4 space-y-4">
              {steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-saffron-600 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <p className="text-sm leading-6 text-saffron-900/80">{step}</p>
                </li>
              ))}
            </ol>
            <p className="mt-4 flex items-start gap-2 rounded-lg bg-saffron-50 px-3 py-2.5 text-xs leading-5 text-saffron-900/80">
              <Icon.heart className="mt-0.5 h-4 w-4 shrink-0 text-saffron-600" />
              You can also take in devotees who registered on their own from the “Unassigned”
              list on your dashboard.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
