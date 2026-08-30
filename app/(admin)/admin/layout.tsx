import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { ToastProvider } from "@/components/toast/toast-provider";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();

  return (
    <div className="min-h-full bg-bg-base">
      <AdminNav />
      <main className="min-h-full lg:ml-64">
        <ToastProvider>{children}</ToastProvider>
      </main>
    </div>
  );
}
