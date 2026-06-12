import Link from "next/link";
import type { Role, User } from "@prisma/client";
import { signOut } from "@/auth";

type NavItem = { href: string; label: string; icon: string };

const NAV: Record<Role, NavItem[]> = {
  ADMIN: [
    { href: "/admin", label: "Dashboard", icon: "🏠" },
    { href: "/admin/devotees", label: "Devotees", icon: "🙏" },
    { href: "/admin/hierarchy", label: "Hierarchy", icon: "🌌" },
    { href: "/admin/applications", label: "Applications", icon: "📨" },
    { href: "/admin/sessions", label: "Sessions", icon: "📅" },
    { href: "/admin/reports", label: "Reports", icon: "📊" },
    { href: "/admin/levels", label: "Levels", icon: "🪜" },
  ],
  MISSIONARY: [
    { href: "/missionary", label: "Dashboard", icon: "🏠" },
    { href: "/missionary/group", label: "My Group", icon: "🙏" },
    { href: "/missionary/sessions", label: "Sessions", icon: "📅" },
    { href: "/missionary/followups", label: "Follow-ups", icon: "📞" },
    { href: "/missionary/reports", label: "Reports", icon: "📊" },
    { href: "/devotee/sadhana", label: "My Sadhana", icon: "📿" },
  ],
  DEVOTEE: [
    { href: "/devotee", label: "Home", icon: "🏠" },
    { href: "/devotee/sadhana", label: "My Sadhana", icon: "📿" },
    { href: "/devotee/level", label: "My Level", icon: "🪜" },
    { href: "/devotee/attendance", label: "Attendance", icon: "✅" },
    { href: "/devotee/apply", label: "Apply", icon: "📨" },
  ],
};

export function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  const items = NAV[user.role];

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="no-print sticky top-0 z-40 border-b border-saffron-900/10 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <Link href={items[0].href} className="flex items-center gap-2">
            <span className="text-xl">🪷</span>
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
              <button className="cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium text-maroon-700 hover:bg-maroon-50">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        {/* Sidebar (desktop) */}
        <nav className="no-print hidden w-52 shrink-0 md:block">
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-saffron-900 hover:bg-saffron-100"
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <main className="min-w-0 flex-1 pb-20 md:pb-6">{children}</main>
      </div>

      {/* Bottom nav (mobile) */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-saffron-900/10 bg-white md:hidden">
        <ul className="flex justify-around">
          {items.slice(0, 5).map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex flex-col items-center gap-0.5 px-3 py-2 text-[11px] font-medium text-saffron-900"
              >
                <span className="text-lg leading-none">{item.icon}</span>
                {item.label}
              </Link>
            </li>
          ))}
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
