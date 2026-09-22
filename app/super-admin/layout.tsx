import type { ReactNode } from "react";
import { PlatformAdminShell } from "@/components/platform-admin/platform-admin-shell";
import { requirePlatformSuperAdmin } from "@/lib/supabase/platform-admin-auth";

export const metadata = { title: "Platform operations · Sync", robots: { index: false, follow: false } };
export default async function PlatformAdminLayout({ children }: { children: ReactNode }) {
  await requirePlatformSuperAdmin();
  return <PlatformAdminShell>{children}</PlatformAdminShell>;
}
