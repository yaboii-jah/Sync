/**
 * Class strings for the handful of places that must stay a real anchor
 * (external links, target="_blank", Next.js <Link> navigation) but should read
 * as a local AWS SCD Button. Everything else uses <Button> directly.
 *
 * These mirror local button tokens rather than inventing colours: the
 * accent pair for primary, the border/foreground pair for secondary.
 * Add `w-full` at the call site when the anchor should fill its container.
 */
const base =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors";

export const primaryLinkClass = `${base} bg-accent text-accent-foreground hover:opacity-90`;

export const secondaryLinkClass = `${base} border-border text-foreground hover:bg-default border`;
