"use client";

import { useActionState } from "react";
import {
  saveLinkedInUrl,
  type SaveLinkedInUrlState,
} from "./actions";

const initialState: SaveLinkedInUrlState = { error: null };

export function LinkedInUrlForm() {
  const [state, formAction, pending] = useActionState(
    saveLinkedInUrl,
    initialState,
  );

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
        placeholder="https://linkedin.com/in/your-name"
        className="rounded-lg border border-border-default bg-bg-base px-4 py-3 text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-border-default"
      />
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
