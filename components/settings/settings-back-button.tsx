"use client";

import { Button } from "@heroui/react";
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
    <div className="mt-6">
      <Button variant="ghost" size="sm" onPress={goBack}>
        <ArrowLeft className="size-4" aria-hidden />
        Back
      </Button>
    </div>
  );
}
