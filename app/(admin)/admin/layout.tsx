import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { AdminNav } from "@/components/admin/admin-nav";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();

  return (
    <div className="bg-background min-h-full">
      <AdminNav />
      <main className="min-h-full lg:ml-64">{children}</main>
    </div>
  );
}
