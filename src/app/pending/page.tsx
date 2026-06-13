import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { homeFor, requireUser } from "@/lib/guards";
import { Badge, Button, Card } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Application under review" };

// Standalone screen for signed-in PENDING users — they have no app area yet.
// Uses requireUser (not requireRole) to avoid the pending-redirect loop.
export default async function PendingPage() {
  const user = await requireUser();
  if (user.status === "ACTIVE") redirect(homeFor(user.role));

  const joinApplication = await prisma.application.findFirst({
    where: { applicantId: user.id, type: "JOIN" },
    orderBy: { createdAt: "desc" },
  });
  const appliedAt = joinApplication?.createdAt ?? user.createdAt;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-saffron-100 to-cream px-4 py-10">
      <Link href="/" className="mb-6 flex items-center gap-2">
        <span className="text-3xl">🪷</span>
        <span className="text-xl font-bold text-saffron-900">Sadhana Companion</span>
      </Link>

      <Card className="w-full max-w-md p-6 text-center sm:p-8">
        <span className="text-4xl">🙏</span>
        <h1 className="mt-3 text-xl font-bold text-saffron-950">
          Hare Krishna, {user.name}
        </h1>
        <p className="mt-2 text-sm leading-6 text-saffron-900/70">
          Your application is under review. A temple counsellor will look at it soon — once you
          are approved, a counsellor will be assigned to guide you and you will begin your
          sadhana journey.
        </p>

        <div className="mt-5 flex items-center justify-center gap-2 text-sm">
          <Badge tone="saffron">Under review</Badge>
          <span className="text-saffron-900/60">Applied on {formatDate(appliedAt)}</span>
        </div>

        <p className="mt-5 rounded-lg bg-saffron-50 px-3 py-2 text-xs leading-5 text-saffron-900/80">
          There is nothing more you need to do right now. Check back here any time — this page
          will turn into your dashboard the moment you are approved.
        </p>

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
          className="mt-6"
        >
          <Button type="submit" variant="secondary" className="w-full">
            Sign out
          </Button>
        </form>
      </Card>

      <p className="mt-6 text-xs text-saffron-900/50">
        <Link href="/" className="hover:text-saffron-700">
          ← Back to home
        </Link>
      </p>
    </div>
  );
}
