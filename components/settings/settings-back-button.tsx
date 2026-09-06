"use client";

import { HistoryBackButton } from "@/components/history-back-button";

export function SettingsBackButton() {
  return (
    <div className="mt-6">
      <HistoryBackButton fallback="/home" />
    </div>
  );
}
