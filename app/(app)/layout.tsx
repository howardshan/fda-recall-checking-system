import { AppShell } from "@/components/AppShell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  // Auth gate is enforced by middleware.ts (PROTECTED_PREFIXES).
  return <AppShell>{children}</AppShell>;
}
