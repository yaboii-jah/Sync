"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { Crosshair } from "lucide-react";

interface ScrollToNowProps {
  targetId: string | null;
}

export function ScrollToNow({ targetId }: ScrollToNowProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 },
    );

    void Promise.resolve().then(() => {
      if (cancelled) return;
      if (!targetId) {
        setVisible(false);
        return;
      }
      const element = document.getElementById(targetId);
      if (!element) {
        setVisible(false);
        return;
      }
      observer.observe(element);
    });

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [targetId]);

  if (!targetId || !visible) return null;

  return (
    <div className="fixed right-4 bottom-24 z-30 lg:right-8 lg:bottom-8">
      <Button
        size="sm"
        aria-label="Jump to the live session"
        onPress={() =>
          document
            .getElementById(targetId)
            ?.scrollIntoView({ behavior: "smooth", block: "center" })
        }
      >
        <Crosshair className="size-4" aria-hidden />
        Now
      </Button>
    </div>
  );
}
