"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function DispatchRefresh({ status }: { status: string | null }) {
  const router = useRouter();

  useEffect(() => {
    if (status !== "pending" && status !== "running") return;
    const timer = window.setInterval(() => router.refresh(), 2000);
    return () => window.clearInterval(timer);
  }, [router, status]);

  return null;
}
