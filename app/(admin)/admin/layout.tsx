import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { redirectLegacyAdmin } from "@/lib/supabase/legacy-admin-routing";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await redirectLegacyAdmin();
  await requireAdmin();

  return (
    <div className="app-field min-h-full">
      <AdminNav />
      <main className="min-h-full pb-24 lg:ml-64 lg:pb-0">{children}</main>
    </div>
  );
}
