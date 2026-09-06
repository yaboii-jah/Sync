import type { ReactNode } from "react";
import { AlertsCountProvider } from "@/components/alerts-count-provider";
import { BottomTabs } from "@/components/bottom-tabs";
import { SideRail } from "@/components/side-rail";
import type { Profile } from "@/lib/supabase/profile";

interface AppNavigationShellProps {
  children: ReactNode;
  isAdmin: boolean;
  profile: Profile | null;
}

/**
 * Shared authenticated chrome. Public networking cards opt into this shell
 * only for signed-in viewers, keeping navigation private to attendees.
 */
export function AppNavigationShell({
  children,
  isAdmin,
  profile,
}: AppNavigationShellProps) {
  return (
    <div className="app-field min-h-full">
      <AlertsCountProvider>
        <SideRail isAdmin={isAdmin} profile={profile} />
        <div className="relative flex min-h-full flex-col pb-24 lg:ml-[232px] lg:pb-0">
          {children}
        </div>
        <BottomTabs />
      </AlertsCountProvider>
    </div>
  );
}
