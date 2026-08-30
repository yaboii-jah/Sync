"use client";

import { RotateCcw } from "lucide-react";

export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-xs font-bold tracking-[0.24em] text-state-error uppercase">Operations unavailable</p>
      <h1 className="mt-3 font-display text-4xl text-text-primary uppercase">Control link interrupted</h1>
      <p className="mt-3 max-w-sm text-sm text-text-muted">The admin data could not be loaded. No mutation was performed.</p>
      <button type="button" onClick={reset} className="mt-6 flex items-center gap-2 rounded-full bg-pastel-yellow px-5 py-3 text-xs font-bold text-charcoal uppercase">
        <RotateCcw className="h-4 w-4" /> Try again
      </button>
    </div>
  );
}
