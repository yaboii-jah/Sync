"use client";

import { useEffect, useState, useTransition } from "react";
import { LogOut } from "lucide-react";
import { signOut } from "@/app/(app)/home/actions";

interface SignOutButtonProps {
  variant?: "icon" | "labeled";
}

export function SignOutButton({ variant = "icon" }: SignOutButtonProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function confirmSignOut() {
    setOpen(false);
    startTransition(async () => {
      await signOut();
    });
  }

  const trigger =
    variant === "icon" ? (
      <button
        type="button"
        aria-label="Sign out"
        onClick={() => setOpen(true)}
        className="rounded-lg p-2 text-text-muted transition-colors hover:text-text-primary"
      >
        <LogOut className="h-5 w-5" />
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-text-muted transition-colors hover:bg-accent-primary/20 hover:text-text-primary"
      >
        <LogOut className="h-5 w-5" />
        <span className="text-sm font-bold">Sign out</span>
      </button>
    );

  return (
    <>
      {trigger}

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm sign out"
          className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="modal-card w-full max-w-sm rounded-3xl border border-border-default bg-bg-base px-6 py-6 text-center shadow-[0_0_40px_rgba(188,131,48,0.3)]"
            onClick={(event) => event.stopPropagation()}
          >
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-state-error/20 text-state-error">
              <LogOut className="h-5 w-5" />
            </span>
            <h2 className="mt-4 font-display text-3xl text-text-primary uppercase">
              Sign out?
            </h2>
            <p className="mt-2 text-sm leading-snug text-text-muted">
              You&apos;ll need to sign back in with LinkedIn to return.
            </p>

            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={confirmSignOut}
                disabled={pending}
                className="w-full rounded-full bg-state-error px-5 py-3 text-xs font-bold tracking-[0.14em] text-white uppercase transition-all hover:brightness-110 disabled:opacity-60 active:scale-95"
              >
                {pending ? "Signing out…" : "Yes, sign out"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="w-full rounded-full border border-border-default px-5 py-3 text-xs font-bold tracking-[0.14em] text-text-muted uppercase transition-colors hover:text-text-primary disabled:opacity-60"
              >
                Stay
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
