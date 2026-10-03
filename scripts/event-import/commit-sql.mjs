import { assertSnapshot, assertPreserved, digest, rehearsalSql, contentChecksSql, TARGETS } from "./rehearsal.mjs";
import { PROJECT_REF } from "./inventory.mjs";

export function committingBundle(snapshot, payload) {
  const original = rehearsalSql(snapshot, payload);
  const validation = original.replace("Rollback-only import rehearsal; no committing mode.", "Reviewed event import transaction; inventory-bound scope.");
  if (!validation.endsWith("\nrollback;\n")) throw new Error("Unexpected rehearsal boundary");
  const candidate = validation.replace(/\nrollback;\n$/, "\ncommit;\n");
  return { candidate, validation, candidate_sha256: digest(candidate), validation_sha256: digest(validation) };
}

export function assertCommittingSql(sql, checksum, snapshot, payload, projectRef) {
  if (projectRef !== PROJECT_REF) throw new Error("Explicit approved production project reference required");
  const expected = committingBundle(snapshot, payload);
  if (checksum !== expected.candidate_sha256 || digest(sql) !== checksum || sql !== expected.candidate) {
    throw new Error("Committing SQL differs from the exact reviewed candidate");
  }
}

export function assertImportedState(before, after, payload) {
  const expectedCounts = { events: 1, sessions: 15, speakers_sponsors: 5, session_speakers: 5 };
  for (const [table, count] of Object.entries(expectedCounts)) {
    if (after.counts.find((row) => row.relation === `public.${table}`)?.rows !== count) throw new Error(`Imported row count mismatch: ${table}`);
  }
  const normalized = { ...after, counts: after.counts.map((row) => TARGETS.includes(row.relation.replace("public.", ""))
    ? before.counts.find((original) => original.relation === row.relation) : row) };
  assertSnapshot(normalized, payload);
  assertPreserved(before, normalized);
}

/** Reuse the rehearsed bidirectional EXCEPT comparisons in a read-only transaction. */
export function contentVerificationSql(snapshot, payload) {
  assertSnapshot(snapshot, payload);
  return `begin read only;
set local statement_timeout = '30s';
set local standard_conforming_strings = on;
${contentChecksSql(snapshot, payload)}
select jsonb_build_object('content_verified',true,'events',(select count(*) from public.events),
 'sessions',(select count(*) from public.sessions),'speakers',(select count(*) from public.speakers_sponsors),
 'links',(select count(*) from public.session_speakers),'published_sessions',(select count(*) from public.sessions where published),
 'event_date_pht',(select (starts_at at time zone 'Asia/Manila')::date from public.events),
 'starts_pht',(select to_char(starts_at at time zone 'Asia/Manila','HH24:MI') from public.events),
 'ends_pht',(select to_char(ends_at at time zone 'Asia/Manila','HH24:MI') from public.events)) as imported;
commit;
`;
}
