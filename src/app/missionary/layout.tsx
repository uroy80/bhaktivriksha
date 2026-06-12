import { requireRole } from "@/lib/guards";
import { AppShell } from "@/components/app-shell";

export default async function MissionaryLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("MISSIONARY");
  return <AppShell user={user}>{children}</AppShell>;
}
