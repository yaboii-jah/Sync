import { access, mkdir, open, readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { prepareSouthSummityImport } from "../../lib/events/south-summity.ts";
import { JOB_NAMES, PROJECT_REF, inventorySql, quoteLiteral } from "./inventory.mjs";
import { inventoryFromRows } from "./cli-response.mjs";
import { query } from "./operator.mjs";
import { digest } from "./rehearsal.mjs";
import { directory, load, maintenanceCheck, save, withOperationLock } from "./run.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const privateName = "speaker-roster-20261007";
const privateDirectory = resolve(directory, privateName);
const attemptPath = resolve(privateDirectory, "execution-attempt.json");
const rosterPath = resolve(root, "docs/event-import/south-summity-speakers.json");
const targetRelations = new Set(["public.speakers_sponsors", "public.session_speakers"]);

const byId = (rows) => [...rows].sort((left, right) => left.id.localeCompare(right.id));
const byPair = (rows) => [...rows].sort((left, right) =>
  `${left.session_id}:${left.speaker_id}`.localeCompare(`${right.session_id}:${right.speaker_id}`));
const databaseTimestamp = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) throw new Error("Event payload contains an invalid timestamp");
  return parsed.toISOString().replace(/\.000Z$/, "+00:00");
};

function parseArguments(args) {
  const [command, projectFlag, projectRef, hashFlag, checksum] = args;
  const expectedLength = command === "execute" ? 5 : 3;
  if (!["inspect", "prepare", "rehearse", "execute"].includes(command) || args.length !== expectedLength
    || projectFlag !== "--project-ref" || projectRef !== PROJECT_REF
    || (command === "execute" && (hashFlag !== "--sql-sha256" || !/^[a-f0-9]{64}$/.test(checksum)))) {
    throw new Error(`Use inspect|prepare|rehearse --project-ref ${PROJECT_REF}, or execute --project-ref ${PROJECT_REF} --sql-sha256 <candidate hash>`);
  }
  return { command, checksum };
}

async function savePrivate(name, value) {
  await save(`${privateName}/${name}`, value);
}

async function loadPrivate(name) {
  return load(`${privateName}/${name}`);
}

async function readRosterManifest() {
  const manifest = JSON.parse(await readFile(rosterPath, "utf8"));
  if (manifest.event_id !== "20261007-0000-4000-8000-000000000001" || manifest.speakers.length !== 5
    || manifest.unconfirmed.length !== 1 || manifest.unconfirmed[0].id !== "20261007-0000-4000-8000-000000000201") {
    throw new Error("Speaker manifest does not match the reviewed South Summity event roster");
  }
  for (const person of manifest.speakers) {
    if (!person.linkedin_url?.startsWith("https://www.linkedin.com/in/")
      || !["speaker", "panelist"].includes(person.role)) throw new Error("Speaker manifest contains an invalid role or LinkedIn URL");
    if (person.photo_url) {
      if (!person.photo_url.startsWith("/new-assets/speaker/")) throw new Error("Portrait path is outside the supplied speaker assets");
      await access(resolve(root, "public", `.${person.photo_url}`));
    }
  }
  return manifest;
}

function rosterStates(payload, manifest) {
  const updatesById = new Map(manifest.speakers.map((person) => [person.id, person]));
  const speakers = payload.speakers.map((person) => {
    const update = updatesById.get(person.id);
    if (!update) return person;
    const speakerFields = { ...update };
    delete speakerFields.session_id;
    return { ...person, ...speakerFields };
  });
  const newPerson = manifest.speakers.find((person) => !payload.speakers.some((existing) => existing.id === person.id));
  if (!newPerson || newPerson.id !== "20261007-0000-4000-8000-000000000206") {
    throw new Error("Jared's new panelist row must use the next reviewed event ID");
  }
  const newSessionId = newPerson.session_id;
  const newSpeakerFields = { ...newPerson };
  delete newSpeakerFields.session_id;
  speakers.push(newSpeakerFields);
  const links = [...payload.speakerLinks, {
    session_id: newSessionId,
    speaker_id: newPerson.id,
  }];
  const event = { ...payload.event, starts_at: databaseTimestamp(payload.event.starts_at), ends_at: databaseTimestamp(payload.event.ends_at) };
  const sessions = payload.sessions.map((session) => ({
    ...session,
    start_time: databaseTimestamp(session.start_time),
    end_time: databaseTimestamp(session.end_time),
  }));
  return {
    before: {
      events: [event],
      sessions,
      speakers: byId(payload.speakers),
      links: byPair(payload.speakerLinks),
    },
    after: {
      events: [event],
      sessions,
      speakers: byId(speakers),
      links: byPair(links),
    },
  };
}

function rosterReadSql() {
  return `begin read only;
set local statement_timeout = '30s';
select jsonb_build_object(
 'events',(select coalesce(jsonb_agg(to_jsonb(e) order by e.id),'[]'::jsonb) from public.events e),
 'sessions',(select coalesce(jsonb_agg(to_jsonb(s) order by s.id),'[]'::jsonb) from public.sessions s),
 'speakers',(select coalesce(jsonb_agg(to_jsonb(p) order by p.id),'[]'::jsonb) from public.speakers_sponsors p),
 'links',(select coalesce(jsonb_agg(to_jsonb(l) order by l.session_id,l.speaker_id),'[]'::jsonb) from public.session_speakers l)
) as roster;
commit;
`;
}

async function readRoster() {
  const rows = await query(rosterReadSql(), privateDirectory);
  if (rows.length !== 1 || !rows[0]?.roster) throw new Error("Production roster read returned an invalid result");
  const state = rows[0].roster;
  return {
    events: state.events,
    sessions: state.sessions,
    speakers: byId(state.speakers),
    links: byPair(state.links),
  };
}

async function captureInventory() {
  return inventoryFromRows(await query(inventorySql(), privateDirectory));
}

function assertInventory(inventory, { speakerCount, linkCount }) {
  if (inventory.session_user !== "postgres" || !["none", "postgres"].includes(inventory.active_role)) {
    throw new Error("Direct production operator session required");
  }
  const counts = new Map(inventory.counts.map((item) => [item.relation, item.rows]));
  if (counts.get("public.events") !== 1 || counts.get("public.sessions") !== 15
    || counts.get("public.speakers_sponsors") !== speakerCount || counts.get("public.session_speakers") !== linkCount) {
    throw new Error("South Summity table counts changed; no speaker update was attempted");
  }
  if (inventory.guards.length !== 0) throw new Error("Unexpected database maintenance guards; no speaker update was attempted");
  if (inventory.cron.length !== JOB_NAMES.length || inventory.cron.some((job) => job.active)
    || digest(inventory.cron.map((job) => job.name).sort()) !== digest([...JOB_NAMES].sort())
    || inventory.running_cron !== 0 || inventory.queued_requests !== 0 || inventory.active_dispatches !== 0) {
    throw new Error("Production jobs or dispatches are not paused and drained");
  }
}

function assertRoster(actual, expected, label) {
  if (digest(actual) !== digest(expected)) {
    const differingTables = Object.keys(expected).filter((table) => digest(actual[table]) !== digest(expected[table]));
    throw new Error(`${label} differs in ${differingTables.join(", ")}; no update was attempted`);
  }
}

function stableInventory(inventory) {
  return {
    ...inventory,
    counts: inventory.counts.filter((entry) => !targetRelations.has(entry.relation)),
  };
}

function assertStableInventory(before, after, allowRosterChanges = false) {
  const left = allowRosterChanges ? stableInventory(before) : before;
  const right = allowRosterChanges ? stableInventory(after) : after;
  if (digest(left) !== digest(right)) throw new Error("Unrelated production inventory changed during the speaker update");
}

function sqlAssertRows(table, rows, key, variable) {
  const json = quoteLiteral(JSON.stringify(rows));
  return `select coalesce(jsonb_agg(to_jsonb(actual) order by ${key}),'[]'::jsonb) into ${variable} from public.${table} actual;
if ${variable} is distinct from ${json}::jsonb then raise exception 'Speaker roster precondition failed: ${table}'; end if;`;
}

function buildSql(before, after, endStatement) {
  const first = before.events[0];
  if (!first || before.events.length !== 1) throw new Error("Expected one imported event");
  const updates = after.speakers.filter((person) => before.speakers.some((old) => old.id === person.id)
    && digest(person) !== digest(before.speakers.find((old) => old.id === person.id)));
  const addition = after.speakers.find((person) => !before.speakers.some((old) => old.id === person.id));
  const newLink = after.links.find((link) => !before.links.some((old) => digest(old) === digest(link)));
  if (updates.length !== 4 || !addition || !newLink) throw new Error("Roster update must replace four placeholders and add one panelist/link");

  const updateSql = updates.map((person) => {
    const prior = before.speakers.find((old) => old.id === person.id);
    return `update public.speakers_sponsors set name=${quoteLiteral(person.name)}, role=${quoteLiteral(person.role)},
 photo_url=${person.photo_url === null ? "null" : quoteLiteral(person.photo_url)},
 organization=${quoteLiteral(person.organization)}, bio=${quoteLiteral(person.bio)}, linkedin_url=${quoteLiteral(person.linkedin_url)}
where id=${quoteLiteral(person.id)}::uuid and name=${quoteLiteral(prior.name)};`;
  }).join("\n");

  const preconditions = [
    sqlAssertRows("events", before.events, "actual.id", "actual_events"),
    sqlAssertRows("sessions", before.sessions, "actual.id", "actual_sessions"),
    sqlAssertRows("speakers_sponsors", before.speakers, "actual.id", "actual_speakers"),
    sqlAssertRows("session_speakers", before.links, "actual.session_id,actual.speaker_id", "actual_links"),
  ].join("\n");
  const postconditions = [
    sqlAssertRows("events", after.events, "actual.id", "actual_events"),
    sqlAssertRows("sessions", after.sessions, "actual.id", "actual_sessions"),
    sqlAssertRows("speakers_sponsors", after.speakers, "actual.id", "actual_speakers"),
    sqlAssertRows("session_speakers", after.links, "actual.session_id,actual.speaker_id", "actual_links"),
  ].join("\n");

  return `-- One-time speaker roster update for ${PROJECT_REF}; no import replay, cleanup, migration, or job change.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
set local idle_in_transaction_session_timeout = '30s';
set local standard_conforming_strings = on;
do $operator$ begin
 if session_user <> 'postgres' or current_setting('role',true) not in ('none','postgres') then raise exception 'Direct operator required'; end if;
 if not pg_try_advisory_xact_lock(741023,1) or not pg_try_advisory_xact_lock(1937337955,20261003) then raise exception 'Production operation lock busy'; end if;
end $operator$;
lock table public.events, public.sessions, public.speakers_sponsors, public.session_speakers in share row exclusive mode;
lock table cron.job in access share mode;
do $baseline$ declare actual_events jsonb; actual_sessions jsonb; actual_speakers jsonb; actual_links jsonb;
begin
 if (select count(*) from public.events) <> 1 or (select count(*) from public.sessions) <> 15 then raise exception 'Event/session baseline changed'; end if;
 if (select count(*) from public.speakers_sponsors) <> 5 or (select count(*) from public.session_speakers) <> 5 then raise exception 'Speaker/link baseline changed'; end if;
 if (select count(*) from cron.job where jobname in (${JOB_NAMES.map(quoteLiteral).join(",")}) and active) <> 0
   or (select count(*) from cron.job where jobname in (${JOB_NAMES.map(quoteLiteral).join(",")})) <> ${JOB_NAMES.length}
   or exists (select 1 from cron.job_run_details where status in ('starting','running','connecting','sending'))
   then raise exception 'Production jobs are not paused and drained'; end if;
 if exists (select 1 from pg_trigger where tgname='sync_maintenance_write_guard') then raise exception 'Unexpected maintenance guard'; end if;
 ${preconditions}
end $baseline$;
${updateSql}
insert into public.speakers_sponsors(id,name,photo_url,role,organization,bio,linkedin_url)
values (${quoteLiteral(addition.id)}::uuid,${quoteLiteral(addition.name)},${addition.photo_url === null ? "null" : quoteLiteral(addition.photo_url)},
 ${quoteLiteral(addition.role)},${quoteLiteral(addition.organization)},${quoteLiteral(addition.bio)},${quoteLiteral(addition.linkedin_url)});
insert into public.session_speakers(session_id,speaker_id)
values (${quoteLiteral(newLink.session_id)}::uuid,${quoteLiteral(newLink.speaker_id)}::uuid);
do $verification$ declare actual_events jsonb; actual_sessions jsonb; actual_speakers jsonb; actual_links jsonb;
begin
 if (select count(*) from public.events) <> 1 or (select count(*) from public.sessions) <> 15 then raise exception 'Event/session preservation failed'; end if;
 if (select count(*) from public.speakers_sponsors) <> 6 or (select count(*) from public.session_speakers) <> 6 then raise exception 'Speaker/link verification failed'; end if;
 ${postconditions}
end $verification$;
select jsonb_build_object('events',1,'sessions',15,'speakers',6,'links',6,
 'opening_keynote_placeholder_preserved',true,'confirmed_speakers',5,'jobs_paused',true) as roster_update;
${endStatement}
`;
}

async function expectedInputs() {
  const payload = prepareSouthSummityImport();
  const manifest = await readRosterManifest();
  return { payload, manifest, states: rosterStates(payload, manifest) };
}

async function assertProductionBaseline(state, payload) {
  const inventory = await captureInventory();
  const roster = await readRoster();
  assertInventory(inventory, { speakerCount: payload.speakers.length, linkCount: payload.speakerLinks.length });
  assertRoster(roster, state.before, "Current production data");
  return { inventory, roster };
}

async function ensureNoAttempt() {
  try { await access(attemptPath); }
  catch (error) { if (error.code === "ENOENT") return; throw error; }
  throw new Error("Speaker roster execution was already attempted; inspect private evidence and live state. No retry is permitted.");
}

async function recordAttempt(candidateHash, manifestHash) {
  const handle = await open(attemptPath, "wx", 0o600);
  const content = `${JSON.stringify({ project_ref: PROJECT_REF, started_at: new Date().toISOString(),
    candidate_sha256: candidateHash, manifest_sha256: manifestHash, retry_permitted: false }, null, 2)}\n`;
  try { await handle.writeFile(content); await handle.sync(); }
  finally { await handle.close(); }
  await writeFile(`${attemptPath}.sha256`, `${digest(content)}\n`, { mode: 0o600, flag: "wx" });
}

export async function main(args = process.argv.slice(2)) {
  const { command, checksum } = parseArguments(args);
  return withOperationLock(async () => {
    await mkdir(privateDirectory, { recursive: true, mode: 0o700 });
    const { payload, manifest, states } = await expectedInputs();
    const manifestHash = digest(manifest);
    const liveMaintenance = await maintenanceCheck();

    if (command === "inspect") {
      const inventory = await captureInventory();
      const roster = await readRoster();
      await savePrivate("inspection.json", { inspected_at: new Date().toISOString(), inventory, roster, maintenance: liveMaintenance });
      console.log(JSON.stringify({ inspected: true, event: roster.events.map(({ id, name, venue, starts_at, ends_at, status }) =>
        ({ id, name, venue, starts_at, ends_at, status })),
      sessions: roster.sessions.map(({ id, title, start_time, end_time, status, published }) =>
        ({ id, title, start_time, end_time, status, published })),
      speakers: roster.speakers.map(({ id, name, role, photo_url, organization }) =>
        ({ id, name, role, photo_url, organization })),
      links: roster.links, counts: inventory.counts.filter((entry) => ["public.events", "public.sessions",
        "public.speakers_sponsors", "public.session_speakers"].includes(entry.relation)),
      jobs: inventory.cron.map(({ name, active }) => ({ name, active })),
      maintenance_guards: inventory.guards.length, public_maintenance: liveMaintenance.status === 503 }, null, 2));
      return;
    }

    if (command === "prepare") {
      await ensureNoAttempt();
      try { await access(resolve(privateDirectory, "review.json")); throw new Error("A speaker roster review already exists; preserve it"); }
      catch (error) { if (error.code !== "ENOENT") throw error; }
      const before = await assertProductionBaseline(states, payload);
      const candidate = buildSql(states.before, states.after, "commit;");
      const validation = buildSql(states.before, states.after, "rollback;");
      await savePrivate("candidate.sql", candidate);
      await savePrivate("validation.sql", validation);
      await savePrivate("review.json", {
        project_ref: PROJECT_REF,
        prepared_at: new Date().toISOString(),
        manifest_sha256: manifestHash,
        payload_sha256: digest(payload),
        candidate_sha256: digest(candidate),
        validation_sha256: digest(validation),
        inventory: before.inventory,
        roster: before.roster,
        maintenance: liveMaintenance,
        scope: "Update four confirmed placeholders, add Jared Remulta as the second panelist/link, preserve the opening keynote placeholder; no other changes",
      });
      console.log(`Speaker roster candidate prepared, not executed. SQL SHA-256: ${digest(candidate)}. Scope: 4 updates, 1 panelist insert, 1 session link.`);
      return;
    }

    const review = JSON.parse(await loadPrivate("review.json"));
    const candidate = await loadPrivate("candidate.sql");
    const validation = await loadPrivate("validation.sql");
    if (review.project_ref !== PROJECT_REF || review.manifest_sha256 !== manifestHash
      || review.payload_sha256 !== digest(payload) || review.candidate_sha256 !== digest(candidate)
      || review.validation_sha256 !== digest(validation)
      || candidate !== buildSql(states.before, states.after, "commit;")
      || validation !== buildSql(states.before, states.after, "rollback;")) {
      throw new Error("Prepared roster candidate no longer matches the reviewed source or checksums");
    }
    const before = await assertProductionBaseline(states, payload);
    assertStableInventory(review.inventory, before.inventory);
    if (digest(review.roster) !== digest(before.roster)) throw new Error("Current roster differs from the prepared review");

    if (command === "rehearse") {
      const validationDirectory = resolve(privateDirectory, "rehearsal");
      await mkdir(validationDirectory, { recursive: true, mode: 0o700 });
      let rows;
      let failure;
      try { rows = await query(validation, validationDirectory); }
      catch (error) { failure = error.message; }
      const afterInventory = await captureInventory();
      const afterRoster = await readRoster();
      assertStableInventory(before.inventory, afterInventory);
      assertRoster(afterRoster, states.before, "Post-rollback production data");
      const result = rows?.[0]?.roster_update;
      const success = !failure && result?.speakers === 6 && result.links === 6
        && result.opening_keynote_placeholder_preserved === true && result.jobs_paused === true;
      const evidence = { project_ref: PROJECT_REF, completed_at: new Date().toISOString(),
        candidate_sha256: digest(candidate), validation_sha256: digest(validation), manifest_sha256: manifestHash,
        rollback_verified: true, preserved: true, success, result: result ?? null, failure: failure ?? null };
      await savePrivate("rehearsal/evidence.json", evidence);
      if (!success) throw new Error(failure ?? "Rollback rehearsal did not report the expected six rows and paused jobs");
      console.log(`Exact speaker roster candidate passed rollback rehearsal. Production data is unchanged. SQL SHA-256: ${digest(candidate)}`);
      return;
    }

    if (checksum !== review.candidate_sha256) throw new Error("Explicit candidate checksum does not match the prepared SQL");
    await ensureNoAttempt();
    const evidence = JSON.parse(await loadPrivate("rehearsal/evidence.json"));
    if (!evidence.success || evidence.rollback_verified !== true || evidence.preserved !== true
      || evidence.candidate_sha256 !== digest(candidate) || evidence.validation_sha256 !== digest(validation)
      || evidence.manifest_sha256 !== manifestHash) throw new Error("Candidate lacks successful exact-body rollback evidence");

    await recordAttempt(digest(candidate), manifestHash);
    let acknowledgement;
    let failure;
    try { acknowledgement = await query(candidate, privateDirectory); }
    catch (error) { failure = error.message; }

    try {
      const afterInventory = await captureInventory();
      const afterRoster = await readRoster();
      assertInventory(afterInventory, { speakerCount: states.after.speakers.length, linkCount: states.after.links.length });
      assertRoster(afterRoster, states.after, "Committed production speaker roster");
      assertStableInventory(before.inventory, afterInventory, true);
      const finalMaintenance = await maintenanceCheck();
      const result = acknowledgement?.[0]?.roster_update ?? null;
      await savePrivate("execution-evidence.json", { project_ref: PROJECT_REF, verified_at: new Date().toISOString(),
        committed: true, candidate_sha256: digest(candidate), manifest_sha256: manifestHash,
        exact_content_verified: true, unrelated_inventory_preserved: true,
        acknowledgement_received: !failure, acknowledgement_failure: failure ?? null,
        roster: afterRoster, maintenance: finalMaintenance, result, retry_permitted: false });
      console.log(`Production speaker roster committed and freshly verified: five confirmed speakers, six roster rows, six links. Opening keynote remains unconfirmed; maintenance and paused jobs are unchanged. Retry is disabled.`);
    } catch (error) {
      await savePrivate("execution-verification-error.json", { recorded_at: new Date().toISOString(),
        error: error.message, query_failure: failure ?? null, retry_permitted: false });
      throw new Error("Execution was attempted. Review live state and protected evidence; no automatic retry or reversal is permitted.");
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
