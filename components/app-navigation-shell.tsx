import type { ReactNode } from "react";
import { AlertsCountProvider } from "@/components/alerts-count-provider";
import { BottomTabs } from "@/components/bottom-tabs";
import { SideRail } from "@/components/side-rail";
import { AppAppearanceBoundary } from "@/components/app-appearance-boundary";
import { AppCornerWashes } from "@/components/app-corner-washes";
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
    <AppAppearanceBoundary>
      <div className="app-field app-field--event min-h-dvh min-w-0 overflow-x-clip">
        <AppCornerWashes />
        <AlertsCountProvider>
          <SideRail isAdmin={isAdmin} profile={profile} />
          <div className="relative flex min-h-dvh min-w-0 flex-col pb-24 lg:ml-[232px] lg:pb-0">
            {children}
          </div>
          <BottomTabs />
        </AlertsCountProvider>
      </div>
    </AppAppearanceBoundary>
  );
}
