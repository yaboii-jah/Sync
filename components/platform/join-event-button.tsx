"use client";

import { useFormStatus } from "react-dom";

export function JoinEventButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-disabled={pending} className="platform-button" data-state={pending ? "loading" : "default"}>
      {pending ? "Joining…" : "Join event"}
    </button>
  );
}
