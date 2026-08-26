"use client";

import { useActionState, useEffect, useState } from "react";
import {
  saveLinkedInUrl,
  type SaveLinkedInUrlState,
} from "./actions";

const initialState: SaveLinkedInUrlState = { error: null };

type LookupStage = "idle" | "searching" | "found" | "none";

export function LinkedInUrlForm({ initialUrl = "" }: { initialUrl?: string }) {
  const [state, formAction, pending] = useActionState(
    saveLinkedInUrl,
    initialState,
  );
  const [value, setValue] = useState(initialUrl);
  const [lookupStage, setLookupStage] = useState<LookupStage>("idle");

  useEffect(() => {
    let cancelled = false;

    async function lookup() {
      // Only worth looking up while the field is still empty.
      if (initialUrl || value) {
        setLookupStage("idle");
        return;
      }

      setLookupStage("searching");
      try {
        const res = await fetch("/api/lookup-linkedin");
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { url: string | null };
        if (cancelled) return;
        if (data.url) {
          setValue(data.url);
          setLookupStage("found");
        } else {
          setLookupStage("none");
        }
      } catch {
        if (!cancelled) setLookupStage("none");
      }
    }

    void lookup();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-4">
      <label
        htmlFor="linkedin_url"
        className="text-left text-sm font-bold text-text-muted"
      >
        Your LinkedIn profile URL
      </label>
      <input
        id="linkedin_url"
        name="linkedin_url"
        type="url"
        required
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="https://linkedin.com/in/your-name"
        className="rounded-lg border border-border-default bg-bg-base px-4 py-3 text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-border-default"
      />

      {lookupStage === "searching" ? (
        <p className="animate-pulse text-left text-sm text-pastel-yellow">
          Searching LinkedIn by your email…
        </p>
      ) : null}
      {lookupStage === "found" ? (
        <p className="text-left text-sm text-state-success">
          We found your profile via your email — confirm it&apos;s you.
        </p>
      ) : null}

      {state.error ? (
        <p className="rounded-lg bg-state-error/20 px-3 py-2 text-sm text-state-error">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-accent-primary px-5 py-3 font-bold text-text-primary transition-all hover:brightness-125 disabled:opacity-60 active:scale-95"
      >
        {pending ? "Saving…" : "Save and continue"}
      </button>
    </form>
  );
}
