import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseQueryRows } from "./cli-response.mjs";
import { PROJECT_REF } from "./inventory.mjs";

export async function query(sql, directory) {
  const file = resolve(directory, "query.sql");
  await writeFile(file, sql, { mode: 0o600 });
  const args = ["supabase", "db", "query", "--linked", "--project-ref", PROJECT_REF,
    "--file", file, "--output", "json", "--agent", "yes"];
  const command = process.platform === "win32" ? "powershell.exe" : "npx";
  const cliArgs = process.platform === "win32" ? ["-NoProfile", "-NonInteractive", "-Command",
    `[Console]::OutputEncoding = [Text.UTF8Encoding]::new(); & npx ${args.map((arg) => `'${arg.replaceAll("'", "''")}'`).join(" ")}; exit $LASTEXITCODE`] : args;
  const result = await new Promise((accept, reject) => {
    const child = spawn(command, cliArgs, { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => accept({ code, stdout, stderr }));
  });
  if (result.code !== 0) {
    await writeFile(resolve(directory, "last-error.txt"), result.stdout + result.stderr, { mode: 0o600 });
    throw new Error("Database query failed; private diagnostics saved in last-error.txt. No retry or unfreeze attempted.");
  }
  try { return parseQueryRows(result.stdout); }
  catch {
    await writeFile(resolve(directory, "last-error.txt"), result.stdout + result.stderr, { mode: 0o600 });
    throw new Error("Database response was invalid; private diagnostics saved in last-error.txt.");
  }
}
