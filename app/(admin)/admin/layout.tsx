import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { AppAppearanceBoundary } from "@/components/app-appearance-boundary";
import { AppCornerWashes } from "@/components/app-corner-washes";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();

  return (
    <AppAppearanceBoundary>
      <div className="app-field app-field--event app-field--admin flex min-h-dvh min-w-0 flex-col overflow-x-clip">
        <AppCornerWashes />
        <AdminNav />
        <main className="min-w-0 flex-1 pb-24 lg:ml-64 lg:pb-0">{children}</main>
      </div>
    </AppAppearanceBoundary>
  );
}
