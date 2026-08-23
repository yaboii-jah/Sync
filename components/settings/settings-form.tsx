"use client";

import { useActionState } from "react";
import {
  updateProfile,
  type UpdateProfileState,
} from "@/app/(app)/settings/actions";

const initialState: UpdateProfileState = { error: null, success: false };

export function SettingsForm({
  initialName,
  initialUrl,
}: {
  initialName: string;
  initialUrl: string;
}) {
  const [state, formAction, pending] = useActionState(
    updateProfile,
    initialState,
  );

  return (
    <form action={formAction} className="mt-4 flex flex-col gap-4">
      <div>
        <label
          htmlFor="name"
          className="text-sm font-bold text-text-muted"
        >
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          defaultValue={initialName}
          required
          className="mt-1 w-full rounded-lg border border-border-default bg-bg-base px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-border-default"
        />
      </div>
      <div>
        <label
          htmlFor="linkedin_url"
          className="text-sm font-bold text-text-muted"
        >
          LinkedIn profile URL
        </label>
        <input
          id="linkedin_url"
          name="linkedin_url"
          type="url"
          defaultValue={initialUrl}
          required
          placeholder="https://linkedin.com/in/your-name"
          className="mt-1 w-full rounded-lg border border-border-default bg-bg-base px-4 py-3 text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-border-default"
        />
      </div>

      {state.error ? (
        <p className="rounded-lg bg-state-error/20 px-3 py-2 text-sm text-state-error">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-lg bg-state-success/20 px-3 py-2 text-sm text-state-success">
          Profile saved.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-pastel-yellow px-5 py-3 text-xs font-bold tracking-[0.14em] text-charcoal uppercase transition-colors hover:bg-light-green disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
