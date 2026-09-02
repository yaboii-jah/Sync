import type { Metadata } from "next";
import type { ReactNode } from "react";
import { BottomTabs } from "@/components/bottom-tabs";
import { SideRail } from "@/components/side-rail";
import { AlertsCountProvider } from "@/components/alerts-count-provider";
import { currentUserIsAdmin } from "@/lib/supabase/admin-auth";

export const metadata: Metadata = {
  title: "Sync",
};

export default async function AppLayout({ children }: { children: ReactNode }) {
  const isAdmin = await currentUserIsAdmin();

  return (
    <div className="bg-background min-h-full">
      <AlertsCountProvider>
        <SideRail isAdmin={isAdmin} />
        <div className="relative flex min-h-full flex-col pb-24 lg:ml-[232px] lg:pb-0">
          {children}
        </div>
        <BottomTabs />
      </AlertsCountProvider>
    </div>
  );
}
