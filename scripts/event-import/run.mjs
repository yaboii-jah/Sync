import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile, open, unlink, copyFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { prepareSouthSummityImport } from "../../lib/events/south-summity.ts";
import { inventorySql, PROJECT_REF } from "./inventory.mjs";
import { inventoryFromRows } from "./cli-response.mjs";
import { query } from "./operator.mjs";
import { assertSnapshot, assertPreserved, assertPreparedSql, digest, rehearsalSql } from "./rehearsal.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const directory = resolve(root, ".production-maintenance/event-import");

export function parseArguments(args) {
  if (args.length !== 3 || !["prepare", "rehearse"].includes(args[0])
    || args[1] !== "--project-ref" || args[2] !== PROJECT_REF) {
    throw new Error(`Use prepare|rehearse --project-ref ${PROJECT_REF}; no committing command exists`);
  }
  return args[0];
}

export async function protectDirectory() {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  if (process.platform !== "win32") return;
  const path = directory.replaceAll("'", "''");
  await new Promise((accept, reject) => {
    const script = `$eventSid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value; & icacls '${path}' /inheritance:r /grant:r ('*' + $eventSid + ':(OI)(CI)F') '*S-1-5-18:(OI)(CI)F' | Out-Null; exit $LASTEXITCODE`;
    const child = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { windowsHide: true, stdio: "ignore" });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? accept() : reject(new Error("Could not restrict private evidence directory access")));
  });
}

export async function save(name, value) {
  const content = typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`;
  await writeFile(resolve(directory, name), content, { mode: 0o600 });
  await writeFile(resolve(directory, `${name}.sha256`), `${digest(content)}\n`, { mode: 0o600 });
}

export async function load(name) {
  const content = await readFile(resolve(directory, name), "utf8");
  const checksum = (await readFile(resolve(directory, `${name}.sha256`), "utf8")).trim();
  if (digest(content) !== checksum) throw new Error(`Private artifact checksum mismatch: ${name}`);
  return content;
}

export async function maintenanceCheck() {
  const domains = ["https://sync.aws-scd.cloud", "https://sync-orpin-nine.vercel.app"];
  for (const domain of domains) {
    const response = await fetch(`${domain}/home`, { redirect: "manual", signal: AbortSignal.timeout(15000) });
    if (response.status !== 503 || !response.headers.get("cache-control")?.includes("no-store")
      || !(await response.text()).toLowerCase().includes("maintenance")) throw new Error("Production website maintenance not verified");
  }
  return { domains, verified_at: new Date().toISOString(), status: 503 };
}

export async function capture() {
  return inventoryFromRows(await query(inventorySql(), directory));
}

async function archivePrevious() {
  const history = resolve(directory, "history", `${new Date().toISOString().replaceAll(/[:.]/g, "-")}-${process.pid}`);
  const names = ["prepared.json", "rehearsal.sql", "preflight.json", "attempt.json", "post-rollback.json", "evidence.json", "last-error.txt"];
  for (const name of names.flatMap((name) => [name, `${name}.sha256`])) {
    try {
      await readFile(resolve(directory, name));
      await mkdir(history, { recursive: true, mode: 0o700 });
      await copyFile(resolve(directory, name), resolve(history, name));
    } catch (error) { if (error.code !== "ENOENT") throw error; }
  }
}

export async function withOperationLock(task) {
  await protectDirectory();
  const lockPath = resolve(directory, "operation.lock");
  const lock = await open(lockPath, "wx", 0o600);
  try {
    await lock.writeFile(JSON.stringify({ pid: process.pid, started_at: new Date().toISOString() }));
    return await task();
  } finally {
    await lock.close();
    await unlink(lockPath);
  }
}

export async function main(args = process.argv.slice(2)) {
  const command = parseArguments(args);
  return withOperationLock(async () => {
    await archivePrevious();
    const maintenance = await maintenanceCheck();
    const payload = prepareSouthSummityImport();
    const snapshot = await capture();
    assertSnapshot(snapshot, payload);
    if (command === "prepare") {
      const sql = rehearsalSql(snapshot, payload);
      await save("prepared.json", { project_ref: PROJECT_REF, captured_at: new Date().toISOString(),
        maintenance, payload_sha256: digest(payload), sql_sha256: digest(sql), inventory: snapshot });
      await save("rehearsal.sql", sql);
      console.log(`Prepared rollback-only import: 1 event, 15 sessions, 5 placeholders, 5 links. SQL SHA-256: ${digest(sql)}. No import executed.`);
      return;
    }
    const prepared = JSON.parse(await load("prepared.json"));
    const sql = await load("rehearsal.sql");
    if (prepared.project_ref !== PROJECT_REF || prepared.payload_sha256 !== digest(payload)) throw new Error("Prepared project/content differs; prepare again for review");
    assertPreparedSql(sql, prepared.sql_sha256, prepared.inventory, payload, args[2]);
    assertPreserved(prepared.inventory, snapshot);
    await save("preflight.json", { project_ref: PROJECT_REF, maintenance, captured_at: new Date().toISOString(), inventory: snapshot });
    await save("attempt.json", { project_ref: PROJECT_REF, started_at: new Date().toISOString(), sql_sha256: digest(sql), committing_supported: false });
    let rows;
    let failure;
    try { rows = await query(sql, directory); }
    catch (error) { failure = error.message; }
    const after = await capture();
    await save("post-rollback.json", { project_ref: PROJECT_REF, captured_at: new Date().toISOString(), inventory: after });
    assertSnapshot(after, payload);
    assertPreserved(snapshot, after);
    const result = rows?.[0]?.rehearsal;
    if (!failure && (rows.length !== 1 || !result?.content_verified || !result?.unrelated_state_verified
      || result.events !== 1 || result.sessions !== 15 || result.speakers !== 5 || result.links !== 5)) failure = "Rehearsal response did not verify expected content";
    await save("evidence.json", { project_ref: PROJECT_REF, verified_at: new Date().toISOString(),
      sql_sha256: digest(sql), payload_sha256: digest(payload), result: result ?? null,
      rollback_preserved: true, committed: false, success: !failure, failure: failure ?? null });
    if (failure) throw new Error(`${failure}; fresh post-rollback state matched the baseline. Inspect private diagnostics before another attempt.`);
    console.log(`Rollback rehearsal passed: 1 event, 15 sessions, 5 placeholders, 5 links. All preserved state matched after rollback. No content committed. SQL SHA-256: ${digest(sql)}`);
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
