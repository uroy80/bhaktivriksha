import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getInviteHost } from "@/lib/invite";
import { homeFor } from "@/lib/guards";
import { ButtonLink, Card } from "@/components/ui";
import { Icon, LotusMark } from "@/components/icons";
import { JoinButton } from "./join-button";

export const metadata: Metadata = { title: "Join a group" };

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-saffron-100 via-saffron-50 to-cream px-4 py-10">
      <Card className="w-full max-w-md p-8 text-center">
        <Link href="/" className="mb-5 inline-flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-saffron-400 to-saffron-600 text-white shadow-md">
            <LotusMark className="h-5 w-5" />
          </span>
          <span className="font-bold text-saffron-900">Sadhana Companion</span>
        </Link>
        {children}
      </Card>
    </div>
  );
}

export default async function JoinPage(props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params;
  const host = await getInviteHost(token);

  if (!host || host.status !== "ACTIVE") {
    return (
      <Shell>
        <h1 className="text-xl font-bold text-saffron-950">Invite not found</h1>
        <p className="mt-2 text-sm text-saffron-900/70">
          This invite link is invalid or has expired. Please ask your counsellor for a fresh one.
        </p>
        <ButtonLink href="/" variant="secondary" className="mt-6">
          Go home
        </ButtonLink>
      </Shell>
    );
  }

  const session = await auth();

  // Not signed in → invite them to register (token carried) or sign in (return here).
  if (!session?.user?.id) {
    return (
      <Shell>
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-saffron-100 text-saffron-700">
          <Icon.invite className="h-6 w-6" />
        </span>
        <h1 className="text-xl font-bold text-saffron-950">
          Join {host.name}&apos;s group
        </h1>
        <p className="mt-2 text-sm text-saffron-900/70">
          {host.name} has invited you to begin your sadhana under their care. Create an account to
          accept, or sign in if you already have one.
        </p>
        <div className="mt-6 space-y-3">
          <ButtonLink href={`/register?join=${encodeURIComponent(token)}`} className="w-full py-3">
            Create my account
          </ButtonLink>
          <ButtonLink
            href={`/login?next=${encodeURIComponent(`/join/${token}`)}`}
            variant="secondary"
            className="w-full py-3"
          >
            I already have an account
          </ButtonLink>
        </div>
      </Shell>
    );
  }

  const me = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!me) {
    return (
      <Shell>
        <h1 className="text-xl font-bold text-saffron-950">Please sign in again</h1>
        <ButtonLink href={`/login?next=${encodeURIComponent(`/join/${token}`)}`} className="mt-6">
          Sign in
        </ButtonLink>
      </Shell>
    );
  }

  // Signed in but can't be claimed via a link.
  if (me.id === host.id || me.role !== "DEVOTEE") {
    return (
      <Shell>
        <h1 className="text-xl font-bold text-saffron-950">Invite link</h1>
        <p className="mt-2 text-sm text-saffron-900/70">
          {me.id === host.id
            ? "This is your own invite link — share it with devotees so they can join your group."
            : "Invite links are for devotees joining a group. Your account already has a role in the temple."}
        </p>
        <ButtonLink href={homeFor(me.role)} className="mt-6">
          Go to my dashboard
        </ButtonLink>
      </Shell>
    );
  }

  // Already in a group.
  if (me.mentorId) {
    const mentor = await prisma.user.findUnique({
      where: { id: me.mentorId },
      select: { name: true },
    });
    return (
      <Shell>
        <h1 className="text-xl font-bold text-saffron-950">You&apos;re already in a group</h1>
        <p className="mt-2 text-sm text-saffron-900/70">
          You are currently cared for by{" "}
          <span className="font-semibold">{mentor?.name ?? "a counsellor"}</span>. If you need to
          move to {host.name}&apos;s group, please ask an admin.
        </p>
        <ButtonLink href="/devotee" className="mt-6">
          Go to my dashboard
        </ButtonLink>
      </Shell>
    );
  }

  // Unassigned devotee → confirm join.
  return (
    <Shell>
      <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-saffron-100 text-saffron-700">
        <Icon.invite className="h-6 w-6" />
      </span>
      <h1 className="text-xl font-bold text-saffron-950">Join {host.name}&apos;s group</h1>
      <p className="mt-2 text-sm text-saffron-900/70">
        {host.name}
        {host.sadhanaLevel?.name ? ` · ${host.sadhanaLevel.name}` : ""} will become your counsellor
        and guide you on your sadhana journey.
      </p>
      <div className="mt-6">
        <JoinButton token={token} missionaryName={host.name} />
      </div>
    </Shell>
  );
}
