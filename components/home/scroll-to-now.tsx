"use client";

import { useEffect, useState } from "react";
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
    <button
      type="button"
      onClick={() =>
        document
          .getElementById(targetId)
          ?.scrollIntoView({ behavior: "smooth", block: "center" })
      }
      aria-label="Jump to the live session"
      className="fixed right-4 bottom-24 z-30 flex items-center gap-2 rounded-full border border-border-default bg-bg-base px-4 py-2.5 text-xs font-bold tracking-wide text-pastel-yellow uppercase shadow-[0_0_20px_rgba(188,131,48,0.35)] transition-transform hover:scale-105 active:scale-95 lg:right-8 lg:bottom-8"
    >
      <Crosshair className="h-4 w-4" />
      Now
    </button>
  );
}
