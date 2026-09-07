import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppNavigationShell } from "@/components/app-navigation-shell";
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
    <AppNavigationShell isAdmin={isAdmin} profile={auth?.profile ?? null}>
      {children}
    </AppNavigationShell>
  );
}
