import Link from "next/link";
import type { Role, User } from "@prisma/client";
import { signOut } from "@/auth";
import { Icon, LotusMark, type IconName } from "@/components/icons";

type NavItem = { href: string; label: string; icon: IconName };

const NAV: Record<Role, NavItem[]> = {
  ADMIN: [
    { href: "/admin", label: "Dashboard", icon: "dashboard" },
    { href: "/admin/devotees", label: "Devotees", icon: "devotees" },
    { href: "/admin/hierarchy", label: "Hierarchy", icon: "hierarchy" },
    { href: "/admin/applications", label: "Applications", icon: "applications" },
    { href: "/admin/sessions", label: "Sessions", icon: "sessions" },
    { href: "/admin/reports", label: "Reports", icon: "reports" },
    { href: "/admin/levels", label: "Levels", icon: "levels" },
  ],
  MISSIONARY: [
    { href: "/missionary", label: "Dashboard", icon: "dashboard" },
    { href: "/missionary/group", label: "My Group", icon: "group" },
    { href: "/missionary/invite", label: "Invite QR", icon: "invite" },
    { href: "/missionary/sessions", label: "Sessions", icon: "sessions" },
    { href: "/missionary/followups", label: "Follow-ups", icon: "followups" },
    { href: "/missionary/reports", label: "Reports", icon: "reports" },
    { href: "/devotee/sadhana", label: "My Sadhana", icon: "sadhana" },
  ],
  DEVOTEE: [
    { href: "/devotee", label: "Home", icon: "dashboard" },
    { href: "/devotee/sadhana", label: "My Sadhana", icon: "sadhana" },
    { href: "/devotee/level", label: "My Level", icon: "levels" },
    { href: "/devotee/attendance", label: "Attendance", icon: "attendance" },
    { href: "/devotee/apply", label: "Advance", icon: "applications" },
  ],
};

export function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  const items = NAV[user.role];

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="no-print sticky top-0 z-40 border-b border-saffron-900/10 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <Link href={items[0].href} className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-saffron-400 to-saffron-600 text-white shadow-sm">
              <LotusMark className="h-5 w-5" />
            </span>
            <span className="font-bold text-saffron-900">Sadhana Companion</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-saffron-900/70 sm:inline">
              {user.name} · <span className="font-medium">{roleLabel(user.role)}</span>
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-maroon-700 hover:bg-maroon-50">
                <Icon.signOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        {/* Sidebar (desktop) */}
        <nav className="no-print hidden w-52 shrink-0 md:block">
          <ul className="space-y-1">
            {items.map((item) => {
              const IconCmp = Icon[item.icon];
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-saffron-900 transition-colors hover:bg-saffron-100"
                  >
                    <IconCmp className="h-[18px] w-[18px] text-saffron-600" strokeWidth={2} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <main className="min-w-0 flex-1 pb-24 md:pb-6">{children}</main>
      </div>

      {/* Bottom nav (mobile) */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-saffron-900/10 bg-white/95 backdrop-blur-md">
        <ul className="flex justify-around">
          {items.slice(0, 5).map((item) => {
            const IconCmp = Icon[item.icon];
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex flex-col items-center gap-1 px-3 py-2.5 text-[11px] font-medium text-saffron-900"
                >
                  <IconCmp className="h-5 w-5 text-saffron-600" strokeWidth={2} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

function roleLabel(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "Admin";
    case "MISSIONARY":
      return "Missionary";
    default:
      return "Devotee";
  }
}
