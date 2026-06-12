import { requireRole } from "@/lib/guards";
import { AppShell } from "@/components/app-shell";

// Everyone has a sadhana — missionaries and admin may use the devotee area too.
export default async function DevoteeLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("DEVOTEE", "MISSIONARY", "ADMIN");
  return <AppShell user={user}>{children}</AppShell>;
}
