import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
