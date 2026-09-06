"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui";

interface HistoryBackButtonProps {
  fallback: string;
  label?: string;
  className?: string;
}

export function HistoryBackButton({
  fallback,
  label = "Back",
  className,
}: HistoryBackButtonProps) {
  const router = useRouter();

  function goBack() {
    let sameOriginReferrer = false;
    if (typeof document !== "undefined" && document.referrer) {
      try {
        sameOriginReferrer =
          new URL(document.referrer).origin === window.location.origin;
      } catch {
        sameOriginReferrer = false;
      }
    }

    if (window.history.length > 1 && sameOriginReferrer) {
      router.back();
      return;
    }

    router.push(fallback);
  }

  return (
    <Button variant="ghost" size="sm" className={className} onPress={goBack}>
      <ArrowLeft className="size-4" aria-hidden />
      {label}
    </Button>
  );
}
