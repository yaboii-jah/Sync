"use client";

import { ChevronRight } from "lucide-react";

interface LiveMiniBarProps {
  targetId: string;
  title: string;
}

export function LiveMiniBar({ targetId, title }: LiveMiniBarProps) {
  function scrollToCard() {
    document
      .getElementById(targetId)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <button
      type="button"
      onClick={scrollToCard}
      aria-label={`Jump to the live session: ${title}`}
      className="border-border bg-surface hover:bg-default sticky top-0 z-30 flex w-full items-center gap-3 border-b px-4 py-2.5 text-left transition-colors lg:hidden"
    >
      {/* Real semantic state: a session is live right now. */}
      <span aria-hidden className="relative flex size-2.5 shrink-0">
        <span className="bg-foreground absolute inline-flex size-full animate-ping rounded-full opacity-50 motion-reduce:animate-none" />
        <span className="bg-foreground relative inline-flex size-2.5 rounded-full" />
      </span>
      <span className="text-xs font-semibold">Live</span>
      <span className="min-w-0 flex-1 truncate text-sm">{title}</span>
      <ChevronRight className="text-muted size-4 shrink-0" aria-hidden />
    </button>
  );
}
