"use client";

import { useActionState, useEffect } from "react";
import {
  saveSocialProfiles,
  setNetworkingCardVisibility,
  type NetworkingActionState,
} from "@/app/(app)/connect/actions";
import { useToast } from "@/components/toast/toast-provider";
import { SOCIAL_NETWORK_LABELS, type SocialNetwork } from "@/lib/social-profiles";

const initialState: NetworkingActionState = {
  error: null,
  field: null,
  success: null,
};

const NETWORK_FIELDS: Array<{
  network: SocialNetwork;
  placeholder: string;
  note: string;
}> = [
  {
    network: "linkedin",
    placeholder: "linkedin.com/in/your-name or your-name",
    note: "Personal member profiles only",
  },
  {
    network: "instagram",
    placeholder: "instagram.com/your.handle or @your.handle",
    note: "Account profiles only, not posts or reels",
  },
  {
    network: "facebook",
    placeholder: "facebook.com/your.name or your.name",
    note: "Profile-shaped links; Pages cannot be distinguished reliably",
  },
];

interface ConnectManagerProps {
  links: Partial<Record<SocialNetwork, string>>;
  isPublic: boolean;
}

export function ConnectManager({ links, isPublic }: ConnectManagerProps) {
  const [saveState, saveAction, savePending] = useActionState(
    saveSocialProfiles,
    initialState,
  );
  const [visibilityState, visibilityAction, visibilityPending] = useActionState(
    setNetworkingCardVisibility,
    initialState,
  );
  const { toast } = useToast();

  useEffect(() => {
    if (saveState.success) toast(saveState.success);
  }, [saveState.success, toast]);

  useEffect(() => {
    if (visibilityState.success) toast(visibilityState.success);
  }, [toast, visibilityState.success]);

  return (
    <div className="mt-6 space-y-6">
      <form
        action={saveAction}
        className="rounded-2xl border border-border-default bg-bg-base px-5 py-6"
      >
        <h2 className="font-display text-2xl text-text-primary uppercase">
          Your social links
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          Add any combination. These links are user-provided and Sync does not
          verify that you own the destination accounts.
        </p>

        <div className="mt-5 space-y-5">
          {NETWORK_FIELDS.map(({ network, placeholder, note }) => {
            const hasError = saveState.field === network;
            const noteId = `${network}-note`;
            const errorId = `${network}-error`;

            return <div key={network}>
              <label
                htmlFor={network}
                className="text-sm font-bold text-text-primary"
              >
                {SOCIAL_NETWORK_LABELS[network]}
              </label>
              <input
                id={network}
                name={network}
                type="text"
                defaultValue={links[network] ?? ""}
                placeholder={placeholder}
                autoCapitalize="none"
                autoCorrect="off"
                aria-describedby={`${noteId}${hasError ? ` ${errorId}` : ""}`}
                aria-invalid={hasError}
                className="mt-1 w-full rounded-lg border border-border-default bg-bg-base px-4 py-3 text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-border-default"
              />
              <p id={noteId} className="mt-1 text-xs text-text-muted">{note}</p>
              {hasError ? (
                <p id={errorId} className="mt-1 text-sm text-state-error">
                  {saveState.error}
                </p>
              ) : null}
            </div>;
          })}
        </div>

        {saveState.error && !saveState.field ? (
          <p aria-live="polite" className="mt-4 rounded-lg bg-state-error/20 px-3 py-2 text-sm text-state-error">
            {saveState.error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={savePending}
          className="mt-5 w-full rounded-full border border-border-default px-5 py-3 text-xs font-bold tracking-[0.14em] text-text-primary uppercase transition-all hover:bg-accent-primary/30 disabled:opacity-60 active:scale-95"
        >
          {savePending ? "Saving..." : "Save social links"}
        </button>
      </form>

      <form
        action={visibilityAction}
        className="rounded-2xl border border-border-default bg-bg-base px-5 py-6"
      >
        <input type="hidden" name="published" value={isPublic ? "false" : "true"} />
        <h2 className="font-display text-2xl text-text-primary uppercase">
          Public card
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          Anyone with your QR or its link can view your display name, photo, and
          saved social destinations. Your email and event activity are never shown.
        </p>

        {visibilityState.error ? (
          <p aria-live="polite" className="mt-4 rounded-lg bg-state-error/20 px-3 py-2 text-sm text-state-error">
            {visibilityState.error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={visibilityPending}
          className={`mt-5 w-full rounded-full px-5 py-3 text-xs font-bold tracking-[0.14em] uppercase transition-all disabled:opacity-60 active:scale-95 ${
            isPublic
              ? "border border-state-error text-state-error hover:bg-state-error/10"
              : "bg-pastel-yellow text-charcoal hover:bg-light-green"
          }`}
        >
          {visibilityPending
            ? "Updating..."
            : isPublic
              ? "Disable public card"
              : "Publish my card"}
        </button>
      </form>
    </div>
  );
}
