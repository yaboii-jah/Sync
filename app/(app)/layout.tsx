import type { Metadata } from "next";
import type { ReactNode } from "react";
import { BottomTabs } from "@/components/bottom-tabs";
import { SideRail } from "@/components/side-rail";
import { ToastProvider } from "@/components/toast/toast-provider";
import { AlertsCountProvider } from "@/components/alerts-count-provider";
import { currentUserIsAdmin } from "@/lib/supabase/admin-auth";

export const metadata: Metadata = {
  title: "Sync",
};

export default async function AppLayout({ children }: { children: ReactNode }) {
  const isAdmin = await currentUserIsAdmin();

  return (
    <div className="min-h-full bg-bg-base">
      <AlertsCountProvider>
        <SideRail isAdmin={isAdmin} />
        <div className="relative flex min-h-full flex-col pb-24 lg:ml-[232px] lg:pb-0">
          <ToastProvider>{children}</ToastProvider>
        </div>
        <BottomTabs />
      </AlertsCountProvider>
    </div>
  );
}
