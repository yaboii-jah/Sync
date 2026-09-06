import type { Metadata } from "next";
import type { ReactNode } from "react";
import { BottomTabs } from "@/components/bottom-tabs";
import { SideRail } from "@/components/side-rail";
import { AlertsCountProvider } from "@/components/alerts-count-provider";
import { currentUserIsAdmin } from "@/lib/supabase/admin-auth";
import { getAuthenticatedProfile } from "@/lib/supabase/profile";

export const metadata: Metadata = {
  title: "Sync",
};

export default async function AppLayout({ children }: { children: ReactNode }) {
  const [isAdmin, auth] = await Promise.all([
    currentUserIsAdmin(),
    getAuthenticatedProfile(),
  ]);

  return (
    <div className="app-field min-h-full">
      <AlertsCountProvider>
        <SideRail isAdmin={isAdmin} profile={auth?.profile ?? null} />
        <div className="relative flex min-h-full flex-col pb-24 lg:ml-[232px] lg:pb-0">
          {children}
        </div>
        <BottomTabs />
      </AlertsCountProvider>
    </div>
  );
}
