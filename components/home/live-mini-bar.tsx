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
      className="sticky top-0 z-30 flex w-full items-center gap-3 rounded-b-xl border-b border-pastel-yellow/40 bg-bg-base px-4 py-2.5 text-left shadow-[0_4px_16px_rgba(0,0,0,0.25)] transition-colors hover:bg-accent-primary/20 lg:hidden"
    >
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-state-success opacity-60" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-state-success" />
      </span>
      <span className="text-[0.62rem] font-bold tracking-[0.18em] text-pastel-yellow uppercase">
        Live
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-bold text-text-primary">
        {title}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" />
    </button>
  );
}
