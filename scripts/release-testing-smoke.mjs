import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArguments, vercelRequest } from "./release-maintenance-smoke.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const privatePaths = ["/home", "/connect", "/alerts", "/more", "/more/photo-booth", "/admin", "/admin/attendees"];
const assets = [
  "/manifest.webmanifest", "/sw.js",
  "/maintenance-assets/geist-latin.woff2", "/maintenance-assets/perandory.otf",
  "/new-assets/SS2026 Icon - Transparent.png", "/assets/south-summit-sue-frame.png",
  "/new-assets/speaker/isaeus-guiang.webp", "/new-assets/speaker/Kevin.webp",
  "/new-assets/speaker/Nina.webp", "/new-assets/speaker/jared-remulta.webp",
  "/icons/icon-192.png", "/icons/icon-512.png", "/icons/apple-icon-180.png",
];

function assertPrivate(response) {
  const cache = response.headers.get("cache-control") ?? "";
  if (!cache.includes("private") || !cache.includes("no-store")) throw new Error("Navigation response is cacheable");
}

function digest(bytes, path) {
  const content = ["/sw.js", "/manifest.webmanifest"].includes(path)
    ? bytes.toString("utf8").replaceAll("\r\n", "\n") : bytes;
  return createHash("sha256").update(content).digest("hex");
}

/** Signed-out release checks; never exchange OAuth codes or create application data. */
/** @param {string} origin @param {(url: URL, options: RequestInit) => Promise<Response>} [request] */
export async function smoke(origin, request = fetch) {
  const checks = [];
  async function get(path, method = "GET") {
    return request(new URL(path, origin), { method, redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(20000) });
  }
  for (const path of ["/"]) {
    for (const method of ["GET", "HEAD"]) {
      const response = await get(path, method);
      if (response.status !== 200) throw new Error(`Public ${path} returned ${response.status}`);
      assertPrivate(response);
      if (method === "GET") {
        const body = await response.text();
        if (!body.includes("Sync") || (path === "/" && !body.includes("South Summity 2026"))) throw new Error("Event landing content missing");
      }
      checks.push({ path, method, status: 200 });
    }
  }
  for (const path of privatePaths) {
    for (const method of ["GET", "HEAD"]) {
      const response = await get(path, method);
      if (response.status !== 307) throw new Error(`Signed-out ${path} returned ${response.status}`);
      assertPrivate(response);
      const destination = new URL(response.headers.get("location"), origin);
      if (destination.origin !== origin || destination.pathname !== "/" || destination.searchParams.get("next") !== path) {
        throw new Error(`Signed-out redirect lost its destination: ${path}`);
      }
      checks.push({ path, method, status: 307 });
    }
  }
  for (const path of ["/login", "/auth/callback"]) {
    const response = await get(path);
    const destination = new URL(response.headers.get("location"), origin);
    if (response.status !== 307 || destination.origin !== origin || destination.pathname !== "/" || destination.search) {
      throw new Error(`Expected landing redirect: ${path}`);
    }
    assertPrivate(response);
    checks.push({ path, method: "GET", status: 307 });
  }
  const maintenance = await get("/maintenance");
  if (maintenance.status !== 200 || !(await maintenance.text()).includes("We’ll be back soon.")) throw new Error("Recovery page unavailable");
  checks.push({ path: "/maintenance", method: "GET", status: 200 });
  for (const path of assets) {
    const response = await get(path);
    if (response.status !== 200) throw new Error(`Release asset unavailable: ${path}`);
    const expected = await readFile(resolve(root, "public", path.slice(1)));
    const received = Buffer.from(await response.arrayBuffer());
    if (digest(expected, path) !== digest(received, path)) throw new Error(`Deployed asset differs: ${path}`);
    checks.push({ path, method: "GET", status: 200, matches_release: true });
  }
  return { origin, verified_at: new Date().toISOString(), maintenance: false, phase: "unannounced-testing", checks };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  Promise.resolve().then(() => smoke(parseArguments(args), args.includes("--vercel") ? vercelRequest : fetch))
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => { console.error(error.message); process.exitCode = 1; });
}
