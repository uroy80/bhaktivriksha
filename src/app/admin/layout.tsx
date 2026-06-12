import { requireRole } from "@/lib/guards";
import { AppShell } from "@/components/app-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("ADMIN");
  return <AppShell user={user}>{children}</AppShell>;
}
