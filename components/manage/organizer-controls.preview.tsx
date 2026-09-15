/* Non-production Hallmark component-state wrapper. Mount inside PlatformShell
 * in a local preview host; deliberately not registered as an application route. */
const states = ["default", "hover", "focus", "active", "disabled", "loading", "error", "success"] as const;

export function OrganizerControlsPreview() {
  return (
    <div className="grid gap-8 sm:grid-cols-2">
      {states.map((state) => (
        <section key={state} className="grid gap-3" data-state={state}>
          <h2 className="font-semibold capitalize">{state}</h2>
          <label className="organizer-field">
            Event venue
            <input className="organizer-input" defaultValue="Community hall" disabled={state === "disabled" || state === "loading"}
              aria-invalid={state === "error"} style={state === "focus" ? { outline: "2px solid var(--platform-focus)", outlineOffset: 2 } : state === "hover" ? { background: "var(--platform-paper-2)" } : undefined} />
          </label>
          <button type="button" className="platform-button w-fit" data-state={state} disabled={state === "disabled" || state === "loading"}
            style={state === "hover" ? { background: "var(--platform-accent-hover)" } : state === "active" ? { transform: "translateY(1px)" } : state === "focus" ? { outline: "2px solid var(--platform-focus-inverse)", outlineOffset: 2, boxShadow: "0 0 0 4px var(--platform-focus)" } : undefined}>
            {state === "loading" ? "Saving…" : "Save event details"}
          </button>
          <p className={`organizer-help ${state === "error" ? "text-danger" : state === "success" ? "text-success" : "text-muted"}`}>
            {state === "error" ? "Check the highlighted event details." : state === "success" ? "Event details saved." : "A venue name, address, or online location."}
          </p>
        </section>
      ))}
    </div>
  );
}
