import type { Metadata } from "next";
import { BottomTabs } from "@/components/bottom-tabs";
import { SideRail } from "@/components/side-rail";

export const metadata: Metadata = {
  title: "Home — Sync",
};

export default function HomeLayout({
  children,
}: LayoutProps<"/home">) {
  return (
    <div className="min-h-full bg-bg-base">
      <SideRail />
      <div className="relative flex min-h-full flex-col pb-24 lg:ml-[232px] lg:pb-0">
        <div className="mx-auto w-full max-w-md px-4 pt-8 lg:max-w-[1280px] lg:px-10 lg:pt-10">
          {children}
        </div>
      </div>
      <BottomTabs />
    </div>
  );
}
