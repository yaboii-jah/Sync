import { assertPreserved } from "../event-import/rehearsal.mjs";

/** OAuth initiation can add/expire flow_state even while users/identities are frozen.
 * Allow its count only when refreshing a reviewed baseline. Never use this to
 * relax the transaction assertions or post-rollback/post-commit comparisons.
 */
export function withCurrentFlowCount(baseline, current) {
  for (const snapshot of [baseline, current]) {
    if (!Number.isSafeInteger(snapshot.auth_counts?.flow_state) || snapshot.auth_counts.flow_state < 0) {
      throw new Error("Complete Auth flow-state inventory required");
    }
  }
  return { ...baseline, auth_counts: { ...baseline.auth_counts, flow_state: current.auth_counts.flow_state } };
}

export function assertFrozenBaseline(baseline, current) {
  assertPreserved(withCurrentFlowCount(baseline, current), current);
}

export function reviewPrefix(args) {
  const index = args.indexOf("--review-id");
  if (index === -1) return "reopening";
  const id = args[index + 1];
  if (!/^[a-z][a-z0-9-]{0,39}$/.test(id ?? "")) throw new Error("Invalid reopening review ID");
  return `reopening/${id}`;
}
