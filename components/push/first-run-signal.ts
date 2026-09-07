"use client";

import { useSyncExternalStore } from "react";

/**
 * First-run prompt ordering (docs/prd-home-ui-fixes.md, FR-5 and D-2).
 *
 * The push explainer goes first: it is a modal dialog and already blocks the
 * page. The install card must stay out of its way until that dialog reaches a
 * terminal state, and it must always be released afterwards — including when
 * the user denies notifications — or the card becomes permanently invisible.
 *
 * PushGate (app/(app)/home/page.tsx) and InstallChip (components/home/
 * home-client.tsx) have no shared ancestor of their own, so the signal lives
 * here as a module-level store in the same shape as install-provider.tsx.
 * Both already mount under InstallProvider (app/providers.tsx), so this module
 * is shared by both without changing either mount point.
 *
 * The default is released, deliberately. A page without a PushGate, or a gate
 * that never resolves, must not be able to hide the install card forever: the
 * gate holds the card explicitly while it is unresolved or on screen, and it
 * releases the hold on unmount.
 */

const RELEASED = true;

let released: boolean = RELEASED;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return released;
}

function getServerSnapshot() {
  return RELEASED;
}

/**
 * Called by PushGate. `held` is true while the push dialog still owns the
 * first run — that includes its initial permission check, so the two prompts
 * cannot appear together.
 */
export function holdInstallPrompt(held: boolean) {
  const next = !held;
  if (next === released) return;

  released = next;
  for (const listener of listeners) listener();
}

/** True when no push dialog is waiting on the user. */
export function useInstallPromptReleased(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
