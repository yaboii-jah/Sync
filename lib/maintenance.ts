import { NextResponse, type NextRequest } from "next/server";

const MAINTENANCE_MESSAGE =
  "Sync is temporarily unavailable for planned maintenance.";

export const maintenanceCopy = {
  title: "Sync | Planned Maintenance",
  description: "Sync is temporarily unavailable while planned updates are in progress.",
  heading: "We’ll be back soon.",
  body: "Sync is temporarily unavailable while we prepare the app for its next event. Please check back soon.",
};

// Ported from bafe7ed. A page rewrite resets 503 to 200 in installed Next.js;
// keep this response independent of React hydration and Supabase configuration.
// The standalone palette mirrors the locked light roles in design.md.
const MAINTENANCE_HTML = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#f7f7fa"><meta name="robots" content="noindex, nofollow">
<title>${maintenanceCopy.title}</title><meta name="description" content="${maintenanceCopy.description}">
<link rel="icon" href="/icons/favicon-32.png"><link rel="manifest" href="/manifest.webmanifest">
<style>
@font-face{font-family:Geist;src:url('/maintenance-assets/geist-latin.woff2') format('woff2');font-weight:100 900;font-style:normal;font-display:swap}
@font-face{font-family:Perandory;src:url('/maintenance-assets/perandory.otf') format('opentype');font-style:normal;font-display:swap}
:root{color-scheme:light;--background:#f7f7fa;--foreground:#17171c;--surface:#fff;--muted:#45454f;--accent:#742bc0;--accent-soft:#f1e8fa;--border:#d8dbe2;--surface-shadow:0 2px 8px rgb(23 23 28 / 4%)}
*{box-sizing:border-box}html,body{overflow-x:clip}body{margin:0;background:var(--background);color:var(--foreground);font-family:Geist,Arial,sans-serif}
main{min-height:100svh;display:flex;align-items:center;justify-content:center;padding:48px 20px;background:var(--background)}
section{width:100%;min-width:0;max-width:576px;border:1px solid var(--border);border-radius:24px;background:var(--surface);padding:40px 24px;text-align:center;box-shadow:var(--surface-shadow)}
p{margin:0}.identity{font-family:Perandory,Arial,sans-serif;font-size:30px;line-height:36px;letter-spacing:.12em;color:var(--foreground)}
.status{display:inline-flex;margin-top:32px;border-radius:999px;background:var(--accent-soft);padding:8px 16px;font-size:14px;font-weight:600;line-height:20px;color:var(--accent)}
h1{margin:24px 0 0;font-size:30px;line-height:36px;letter-spacing:-.025em;font-weight:600;overflow-wrap:anywhere}.description{max-width:448px;margin:16px auto 0;font-size:16px;line-height:28px;color:var(--muted)}
@media(min-width:640px){section{padding:56px 40px}h1{font-size:36px;line-height:40px}}
</style></head><body><main><section aria-labelledby="maintenance-title">
<p class="identity">Sync</p><p class="status" role="status">Planned maintenance</p>
<h1 id="maintenance-title">${maintenanceCopy.heading}</h1><p class="description">${maintenanceCopy.body}</p>
</section></main></body></html>`;

export function isMaintenanceModeEnabled(
  value = process.env.MAINTENANCE_MODE,
): boolean {
  return value === "true";
}

export function maintenanceResponse(request: NextRequest): NextResponse {
  const headers = new Headers({
    "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate",
    Expires: "0",
    Pragma: "no-cache",
  });

  if (request.method !== "GET" && request.method !== "HEAD") {
    headers.set("Content-Type", "text/plain; charset=utf-8");
    return new NextResponse(MAINTENANCE_MESSAGE, { status: 503, headers });
  }

  headers.set("Content-Type", "text/html; charset=utf-8");
  return new NextResponse(request.method === "HEAD" ? null : MAINTENANCE_HTML, {
    status: 503,
    headers,
  });
}
