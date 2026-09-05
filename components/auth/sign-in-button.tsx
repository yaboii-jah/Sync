"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function SignInButton({ next }: { next?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function startSignIn() {
    if (pending) return;

    setPending(true);
    setError(false);

    const callback = new URL("/auth/callback", window.location.origin);
    if (next) callback.searchParams.set("next", next);

    const { data, error: authError } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callback.toString(),
        skipBrowserRedirect: true,
      },
    });

    if (authError || !data.url) {
      setPending(false);
      setError(true);
      return;
    }

    window.location.assign(data.url);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void startSignIn()}
        disabled={pending}
        className="rounded-full bg-pastel-yellow px-7 py-3 text-xs font-bold tracking-[0.14em] text-charcoal uppercase transition-all hover:bg-light-green disabled:cursor-wait disabled:opacity-70 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pastel-yellow"
      >
        {pending ? "Opening Google..." : "Sign in with Google"}
      </button>
      {error ? (
        <p className="mt-4 text-sm text-state-error" role="alert">
          Could not start Google sign-in. Please try again.
        </p>
      ) : null}
    </>
  );
}
