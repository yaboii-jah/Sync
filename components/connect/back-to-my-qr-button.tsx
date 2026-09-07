"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui";

interface BackToMyQrButtonProps {
  label?: string;
}

/**
 * Uses a unique Connect URL so returning after a scan does not restore a
 * router-cache entry from before the scan-history write.
 */
export function BackToMyQrButton({
  label = "Back to my QR",
}: BackToMyQrButtonProps) {
  const router = useRouter();

  function returnToConnect() {
    router.push(`/connect?scan=${Date.now()}#my-qr`);
  }

  return (
    <Button size="md" onPress={returnToConnect}>
      <ArrowLeft className="size-4" aria-hidden />
      {label}
    </Button>
  );
}
