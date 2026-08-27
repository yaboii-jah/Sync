"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export function SettingsBackButton() {
  const router = useRouter();

  function goBack() {
    const sameOriginReferrer =
      typeof document !== "undefined" &&
      document.referrer.startsWith(window.location.origin);

    if (window.history.length > 1 && sameOriginReferrer) {
      router.back();
      return;
    }

    router.push("/home");
  }

  return (
    <button
      type="button"
      onClick={goBack}
      className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-text-muted transition-colors hover:text-text-primary"
    >
      <ArrowLeft className="h-4 w-4" />
      Back
    </button>
  );
}
