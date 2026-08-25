import type { Metadata } from "next";
import type { ReactNode } from "react";
import { BottomTabs } from "@/components/bottom-tabs";
import { SideRail } from "@/components/side-rail";
import { ToastProvider } from "@/components/toast/toast-provider";

export const metadata: Metadata = {
  title: "Sync",
};

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full bg-bg-base">
      <SideRail />
      <div className="relative flex min-h-full flex-col pb-24 lg:ml-[232px] lg:pb-0">
        <ToastProvider>{children}</ToastProvider>
      </div>
      <BottomTabs />
    </div>
  );
}
