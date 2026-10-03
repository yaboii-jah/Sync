import { readFile, mkdtemp, unlink, rmdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const gatedPaths = ["/", "/login", "/home", "/alerts", "/admin", "/auth/callback"];
const assets = [
  "/manifest.webmanifest", "/sw.js",
  "/maintenance-assets/geist-latin.woff2", "/maintenance-assets/perandory.otf",
  "/new-assets/SS2026 Icon - Transparent.png",
  "/assets/south-summity-frame-1.png", "/assets/south-summity-frame-2.png",
  "/icons/favicon-32.png", "/icons/favicon-64.png", "/icons/mascot-96.png",
  "/icons/icon-192.png", "/icons/icon-512.png", "/icons/icon-maskable-512.png",
  "/icons/icon-splash-192.png", "/icons/icon-splash-512.png",
  "/icons/notification-icon-192.png", "/icons/notification-badge-96.png", "/icons/apple-icon-180.png",
];

export function parseArguments(args) {
  if (![2, 3].includes(args.length) || args[0] !== "--url" || (args.length === 3 && args[2] !== "--vercel")) {
    throw new Error("Use --url <origin> [--vercel]");
  }
  const url = new URL(args[1]);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if ((url.protocol !== "https:" && !(local && url.protocol === "http:"))
    || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("An HTTPS origin or local HTTP origin without credentials is required");
  }
  return url.origin;
}

/** Parse the last HTTP block, after any connection or interim response. */
export function parseHeaders(text) {
  const blocks = text.split(/\r?\n\r?\n/).filter((block) => /^HTTP\/\S+ \d{3}/.test(block));
  const lines = blocks.at(-1)?.split(/\r?\n/);
  if (!lines) throw new Error("Authenticated request returned no HTTP headers");
  const status = Number(lines[0].split(" ")[1]);
  const headers = new Headers();
  for (const line of lines.slice(1)) {
    const separator = line.indexOf(":");
    if (separator > 0) headers.append(line.slice(0, separator), line.slice(separator + 1).trim());
  }
  return { status, headers };
}

/** Vercel CLI supplies protection bypass; no credential is printed or persisted in the report. */
export async function vercelRequest(url, options) {
  const temporary = await mkdtemp(resolve(tmpdir(), "sync-release-http-"));
  const bodyFile = resolve(temporary, "body");
  const headersFile = resolve(temporary, "headers");
  try {
    const flags = options.method === "HEAD" ? ["--head"] : ["--request", options.method];
    const args = ["curl", url.pathname, "--deployment", url.origin, "--scope", "jahmell-dorias-projects", "--",
      "--silent", "--show-error", "--compressed", "--max-time", "20", ...flags,
      "--output", bodyFile, "--dump-header", headersFile];
    const command = process.platform === "win32" ? "powershell.exe" : "vercel";
    const cliArgs = process.platform === "win32" ? ["-NoProfile", "-NonInteractive", "-Command",
      `& vercel ${args.map((arg) => `'${arg.replaceAll("'", "''")}'`).join(" ")}; exit $LASTEXITCODE`] : args;
    await new Promise((accept, reject) => {
      const child = spawn(command, cliArgs, { windowsHide: true, stdio: "ignore", cwd: root });
      child.on("error", () => reject(new Error("Authenticated Vercel request could not start")));
      child.on("close", (code) => code === 0 ? accept() : reject(new Error("Authenticated Vercel request failed")));
    });
    const { status, headers } = parseHeaders(await readFile(headersFile, "utf8"));
    return new Response(options.method === "HEAD" ? null : new Uint8Array(await readFile(bodyFile)), { status, headers });
  } finally {
    for (const path of [bodyFile, headersFile]) await unlink(path).catch((error) => { if (error.code !== "ENOENT") throw error; });
    await rmdir(temporary);
  }
}

export async function assertMaintenance(response, method) {
  if (response.status !== 503) throw new Error(`Expected 503, received ${response.status}`);
  const cache = response.headers.get("cache-control") ?? "";
  if (!cache.includes("no-store") || !cache.includes("no-cache")) throw new Error("Maintenance response can be cached");
  if (response.headers.has("location")) throw new Error("Maintenance response redirects");
  const body = await response.text();
  if (method === "HEAD") {
    if (body) throw new Error("HEAD response has a body");
  } else {
    const type = method === "GET" ? "text/html" : "text/plain";
    if (!response.headers.get("content-type")?.includes(type)) throw new Error(`Expected ${type}`);
    if (!body.includes("Sync") || !/maintenance/i.test(body)) throw new Error("Maintenance content missing");
    if (method === "GET" && !body.includes("We’ll be back soon.")) throw new Error("Expected maintenance heading missing");
  }
}

function digest(bytes, path) {
  const content = ["/sw.js", "/manifest.webmanifest"].includes(path)
    ? bytes.toString("utf8").replaceAll("\r\n", "\n") : bytes;
  return createHash("sha256").update(content).digest("hex");
}

/** @param {string} origin @param {(url: URL, options: RequestInit) => Promise<Response>} [request] */
export async function smoke(origin, request = fetch) {
  const checks = [];
  async function get(path, method = "GET") {
    return request(new URL(path, origin), { method, redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(20000) });
  }
  for (const path of gatedPaths) {
    for (const method of ["GET", "HEAD"]) {
      await assertMaintenance(await get(path, method), method);
      checks.push({ path, method, status: 503 });
    }
  }
  // Unimplemented path: even a failed gate cannot reach an application mutation.
  await assertMaintenance(await get("/api/release-maintenance-check", "POST"), "POST");
  checks.push({ path: "/api/release-maintenance-check", method: "POST", status: 503 });
  const page = await get("/maintenance");
  if (page.status !== 200 || !(await page.text()).includes("We’ll be back soon.")) throw new Error("Normal maintenance page unavailable");
  checks.push({ path: "/maintenance", method: "GET", status: 200 });
  for (const path of assets) {
    const response = await get(path);
    if (response.status !== 200) throw new Error(`Required asset unavailable: ${path}`);
    const expected = await readFile(resolve(root, "public", path.slice(1)));
    const received = Buffer.from(await response.arrayBuffer());
    if (digest(expected, path) !== digest(received, path)) throw new Error(`Deployed asset differs from release: ${path}`);
    checks.push({ path, method: "GET", status: 200, matches_release: true });
  }
  return { origin, verified_at: new Date().toISOString(), maintenance: true, checks };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  Promise.resolve().then(() => smoke(parseArguments(args), args.includes("--vercel") ? vercelRequest : fetch))
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => { console.error(error.message); process.exitCode = 1; });
}
