import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { AdminNav } from "@/components/admin/admin-nav";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();

  return (
    <div className="app-field min-h-full">
      <AdminNav />
      <main className="min-h-full pb-24 lg:ml-64 lg:pb-0">{children}</main>
    </div>
  );
}
