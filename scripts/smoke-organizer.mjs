// Local-only acceptance probe. Requires the app on port 3100, Docker, and Edge.
// No credentials are printed. Only this run's UUID-scoped fixtures are removed.
import assert from "node:assert/strict";
import { execFileSync, execSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const app = process.env.SMOKE_APP_URL ?? "http://localhost:3100";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(app).hostname), "Local app is required");
const status = JSON.parse(execSync("npx supabase status --output json", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
assert.equal(new URL(status.API_URL).hostname, "127.0.0.1", "Local Supabase is required");
assert.equal(new URL(status.API_URL).port, "54321");
const key = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
const root = createClient(status.API_URL, status.SECRET_KEY ?? status.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const users = [];
const events = [];
let browser;
let socket;
const pending = new Map();
let sequence = 0;
const suffix = randomUUID().slice(0, 8);
const pause = () => new Promise((resolve) => setTimeout(resolve, 150));

function sql(statement) {
  return execFileSync("docker", ["exec", "-i", "supabase_db_sync", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"], { input: statement, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
}
async function checked(result) {
  const { data, error } = await result;
  if (error) throw new Error(`Local fixture operation failed (${error.code ?? error.status ?? "unknown"})`);
  return data;
}
async function user(label) {
  const email = `organizer-smoke-${suffix}-${label}@example.test`;
  const password = randomUUID();
  const { user: created } = await checked(root.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name: `Smoke ${label}` } }));
  users.push(created.id);
  let cookies = [];
  const client = createServerClient(status.API_URL, key, { cookies: {
    getAll: () => cookies,
    setAll: (next) => { for (const item of next) cookies = [...cookies.filter((old) => old.name !== item.name), item]; },
  } });
  await checked(client.auth.signInWithPassword({ email, password }));
  assert.match(created.id, /^[0-9a-f-]{36}$/i);
  sql(`INSERT INTO public.profiles (id, name) VALUES ('${created.id}', 'Smoke ${label}') ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;`);
  return { id: created.id, email, client, cookies };
}
async function create(owner, label) {
  const slug = `smoke-${suffix}-${label}`;
  const id = await checked(owner.client.rpc("create_event", {
    event_name: `Smoke ${label}`, event_slug: slug, event_description: "Local acceptance fixture", event_venue: "Test venue",
    event_timezone: "Asia/Manila", event_starts_at: "2027-01-15T01:00:00Z", event_ends_at: "2027-01-15T09:00:00Z", mutation_request_id: randomUUID(),
  }));
  events.push(id);
  return { id, slug };
}
async function route(path, actor, expected, location) {
  const response = await fetch(`${app}${path}`, { redirect: "manual", headers: actor ? { Cookie: actor.cookies.map(({ name, value }) => `${name}=${value}`).join("; ") } : {} });
  assert.equal(response.status, expected, `${path} status`);
  if (location) assert.equal(response.headers.get("location"), location, `${path} destination`);
  return response.text();
}
function cdp(method, params = {}) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`Browser command timed out: ${method}`)); }, 15000);
    pending.set(id, { resolve, reject, timeout });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await cdp("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error("Browser evaluation failed");
  return result.result.value;
}
async function until(expression) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) { if (await evaluate(expression)) return; await pause(); }
  const feedback = await evaluate("JSON.stringify({state: document.querySelector('form')?.dataset.state, venue: document.querySelector('[name=venue]')?.value, feedback: Array.from(document.querySelectorAll('[role=alert], [role=status], .organizer-help')).map(node => node.textContent).join(' | ')})");
  throw new Error(`Browser acceptance timed out: ${expression}; feedback: ${feedback}`);
}
async function navigate(path) {
  await cdp("Page.navigate", { url: `${app}${path}` });
  await until(`location.pathname === ${JSON.stringify(path)} && document.readyState === 'complete'`);
  await pause();
}
async function fill(name, value) {
  await evaluate(`(() => { const input = document.querySelector('[name="${name}"]'); if (!input) throw Error('Missing input'); input.focus(); input.select(); })()`);
  await cdp("Input.insertText", { text: value });
  await pause();
}

try {
  const owner = await user("owner");
  const other = await user("other");
  const admin = await user("admin");
  const attendee = await user("attendee");
  const first = await create(owner, "first");
  const second = await create(other, "second");
  for (const id of [first.id, admin.id, attendee.id]) assert.match(id, /^[0-9a-f-]{36}$/i);
  sql(`INSERT INTO public.event_memberships (event_id, user_id, role, status, display_name_snapshot)
    VALUES ('${first.id}', '${admin.id}', 'admin', 'active', 'Smoke admin'),
           ('${first.id}', '${attendee.id}', 'attendee', 'active', 'Smoke attendee');`);
  await route("/events/new", owner, 200);
  assert.match(await route(`/manage/${first.slug}`, owner, 200), /Draft setup/);
  await route(`/manage/${first.slug}/basics`, admin, 200);
  await route(`/manage/${first.slug}`, other, 404);
  await route(`/manage/${first.slug}/basics`, attendee, 404);
  await route(`/manage/${second.slug}`, owner, 404);
  await route("/admin", owner, 307, `/manage/${first.slug}`);
  await route("/admin", attendee, 307, "/events");
  await route("/events/new", null, 307);
  console.log("PASS: two-tenant owner/admin routes, attendee denial, anonymous protection, legacy redirects");

  browser = spawn("C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", ["--headless=new", "--remote-debugging-port=9227", `--user-data-dir=${mkdtempSync(join(tmpdir(), "sync-organizer-browser-"))}`, "--no-first-run", "--no-default-browser-check"], { windowsHide: true, stdio: "ignore" });
  let target;
  for (let attempt = 0; attempt < 50; attempt++) {
    try { target = await (await fetch("http://127.0.0.1:9227/json/new?about:blank", { method: "PUT" })).json(); break; } catch { await pause(); }
  }
  assert.ok(target?.webSocketDebuggerUrl, "Edge debugging session");
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    const request = pending.get(message.id);
    if (!request) return;
    clearTimeout(request.timeout); pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message)); else request.resolve(message.result);
  });
  await cdp("Page.enable"); await cdp("Runtime.enable"); await cdp("Network.enable");
  await cdp("Network.setCookies", { cookies: owner.cookies.map(({ name, value }) => ({ name, value, url: app, path: "/" })) });
  await navigate(`/manage/${first.slug}/basics`);
  await until("!!document.querySelector('[name=venue]') && Object.keys(document.querySelector('[name=venue]')).some(key => key.startsWith('__reactProps'))");
  await fill("venue", "Browser updated venue");
  await evaluate("document.querySelector('form').requestSubmit()");
  await until("document.body.innerText.includes('Event details saved')");
  assert.equal((await checked(owner.client.from("events").select("venue").eq("id", first.id).single())).venue, "Browser updated venue");
  for (const width of [320, 375, 414, 768]) {
    await cdp("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: false });
    assert.ok(await evaluate("document.documentElement.scrollWidth <= innerWidth"), `Basics layout overflow at ${width}px`);
  }
  const contrasts = await evaluate(`(() => {
    const style = getComputedStyle(document.querySelector('.sync-app'));
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d');
    const luminance = (token) => { context.fillStyle = style.getPropertyValue(token).trim(); context.fillRect(0, 0, 1, 1); const channels = [...context.getImageData(0, 0, 1, 1).data].slice(0, 3).map(value => { value /= 255; return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4; }); return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722; };
    const ratio = (a, b) => { a = luminance(a); b = luminance(b); return (Math.max(a,b) + .05) / (Math.min(a,b) + .05); };
    return { text: ratio('--platform-ink', '--platform-paper'), helper: ratio('--platform-neutral', '--platform-paper'), error: ratio('--platform-error', '--platform-paper'), success: ratio('--platform-success', '--platform-paper'), button: ratio('--platform-accent-ink', '--platform-accent'), border: ratio('--platform-neutral', '--field-background'), focus: ratio('--platform-focus', '--platform-paper') };
  })()`);
  for (const [name, ratio] of Object.entries(contrasts)) assert.ok(ratio >= (name === 'border' || name === 'focus' ? 3 : 4.5), `${name} contrast ${ratio}`);
  const screenshotPath = join(mkdtempSync(join(tmpdir(), 'sync-organizer-preview-')), 'basics.png');
  writeFileSync(screenshotPath, Buffer.from((await cdp('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  console.log(`PASS: text/control contrast; screenshot: ${screenshotPath}`);
  console.log("PASS: browser basics server-action save and 320/375/414/768px overflow checks");
  await navigate('/events/new');
  await until("!!document.querySelector('[name=name]') && Object.keys(document.querySelector('[name=name]')).some(key => key.startsWith('__reactProps'))");
  await fill('name', `Browser draft ${suffix}`);
  await fill('timezone', 'Asia/Manila');
  for (const [name, value] of [['startsAt', '2027-02-01T09:00'], ['endsAt', '2027-02-01T17:00']]) {
    await evaluate(`(() => { const input = document.querySelector('[name=${name}]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '${value}'); input.dispatchEvent(new Event('input', {bubbles:true})); input.dispatchEvent(new Event('change', {bubbles:true})); })()`);
  }
  await pause();
  await evaluate("document.querySelector('form').requestSubmit()");
  const browserSlug = `browser-draft-${suffix}`;
  await until(`location.pathname === '/manage/${browserSlug}'`);
  const created = await checked(owner.client.from('events').select('id,lifecycle,timezone').eq('slug', browserSlug).single());
  events.push(created.id);
  assert.equal(created.lifecycle, 'draft'); assert.equal(created.timezone, 'Asia/Manila');
  console.log('PASS: browser draft creation, suggested slug, timezone, and management redirect');
  await checked(owner.client.rpc('delete_untouched_draft_event', { target_event_id: created.id, deletion_reason: 'Finished browser creation acceptance', mutation_request_id: randomUUID() }));
  await navigate(`/manage/${first.slug}`);
  await until("Array.from(document.querySelectorAll('button')).some(button => button.textContent === 'Publish event')");
  await evaluate("Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'Publish event').click()");
  await until("document.body.innerText.includes('Managing as owner · published')");
  await route(`/e/${first.slug}`, null, 200);
  await evaluate("Array.from(document.querySelectorAll('details')).find(item => item.querySelector('summary').textContent === 'Archive event').open = true");
  await fill("reason", "Local browser acceptance archive");
  await evaluate("Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'Archive event').click()");
  await until("Array.from(document.querySelectorAll('[role=status]')).some(node => node.textContent.includes('Archived.'))");
  assert.equal((await checked(owner.client.from("events").select("lifecycle").eq("id", first.id).single())).lifecycle, "archived");
  console.log("PASS: browser publication, public route, and archive/read-only transition");
  const disposable = await create(owner, "delete");
  await navigate(`/manage/${disposable.slug}`);
  await until("!!document.querySelector('[name=confirmation]')");
  await evaluate("Array.from(document.querySelectorAll('details')).find(item => item.querySelector('summary').textContent === 'Delete untouched draft').open = true");
  // Select the deletion form's reason, not the separate archival reason.
  await evaluate("document.querySelector('[name=confirmation]').closest('form').querySelector('[name=reason]').focus(); document.querySelector('[name=confirmation]').closest('form').querySelector('[name=reason]').select()");
  await cdp('Input.insertText', { text: 'Local browser acceptance deletion' });
  await fill('confirmation', 'Smoke delete');
  await evaluate("Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'Delete draft').click()");
  await until("location.pathname === '/events'");
  assert.equal((await checked(owner.client.from('events').select('id').eq('id', disposable.id))).length, 0);
  console.log('PASS: browser reason/name-gated untouched draft deletion');
  sql(`INSERT INTO public.platform_quota_overrides (user_id, active_event_limit, reason, updated_by) VALUES ('${owner.id}', 1, 'Local concurrent quota acceptance', '${owner.id}');`);
  const racing = await Promise.allSettled([create(owner, 'race-a'), create(owner, 'race-b')]);
  assert.equal(racing.filter(result => result.status === 'fulfilled').length, 1, 'Exactly one concurrent creation fits the quota');
  assert.equal(racing.filter(result => result.status === 'rejected').length, 1);
  console.log('PASS: concurrent per-owner creation quota enforcement');
  const previewDir = mkdtempSync(join(tmpdir(), 'sync-theme-preview-'));
  let fixedTheme;
  for (const actor of [owner, other, admin, attendee]) {
    await cdp("Network.clearBrowserCookies");
    await cdp("Network.setCookies", { cookies: actor.cookies.map(({ name, value }) => ({ name, value, url: app, path: "/" })) });
    await navigate("/events");
    await until("!!document.querySelector('.sync-app')");
    const appearance = await evaluate(`(() => {
      const style = getComputedStyle(document.querySelector('.sync-app'));
      return ['--background', '--foreground', '--accent', '--success', '--font-sans'].map(token => style.getPropertyValue(token).trim());
    })()`);
    if (!fixedTheme) fixedTheme = appearance;
    else assert.deepEqual(appearance, fixedTheme, "Every role and tenant shares the same theme");
  }
  console.log("PASS: identical computed theme across both owners, event admin, and attendee");
  await cdp("Network.clearBrowserCookies");
  await navigate("/");
  for (const width of [320, 375, 414, 768, 1280, 1920]) {
    await cdp("Emulation.setDeviceMetricsOverride", { width, height: width >= 1280 ? 800 : 900, deviceScaleFactor: 1, mobile: false });
    assert.ok(await evaluate("document.documentElement.scrollWidth <= innerWidth"), `Landing overflow at ${width}px`);
    assert.equal(await evaluate("getComputedStyle(document.querySelector('.sync-app')).getPropertyValue('--background').trim()"), "#052f3c");
    if ([320, 768, 1280].includes(width)) {
      writeFileSync(join(previewDir, `landing-${width}.png`), Buffer.from((await cdp("Page.captureScreenshot", { format: "png" })).data, "base64"));
    }
  }
  for (const path of ["/opengraph-image", "/twitter-image"]) {
    const response = await fetch(`${app}${path}`);
    assert.equal(response.status, 200, `${path} renders`);
    assert.match(response.headers.get("content-type"), /image\/png/);
    writeFileSync(join(previewDir, `${path.slice(1)}.png`), Buffer.from(await response.arrayBuffer()));
  }
  console.log(`PASS: landing 320–1920px, fixed dark theme, and both social previews; screenshots: ${previewDir}`);
} finally {
  if (socket?.readyState === WebSocket.OPEN) { try { await cdp("Browser.close"); } catch { /* Already closed. */ } socket.close(); }
  browser?.kill();
  for (const id of [...users, ...events]) assert.match(id, /^[0-9a-f-]{36}$/i);
  if (users.length) {
    // Administrative fixture teardown only: exact IDs, never a broad table reset.
    const list = (ids) => ids.map((id) => `'${id}'::uuid`).join(",");
    // Discover even a created draft whose response failed before its ID arrived.
    const owned = sql(`SELECT event_id FROM public.event_memberships WHERE user_id IN (${list(users)}) AND role = 'owner';`);
    events.push(...(owned.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi) ?? []));
    const eventList = events.length ? list(events) : "NULL::uuid";
    sql(`BEGIN; SET LOCAL session_replication_role = replica;
      DELETE FROM public.event_audit_log WHERE event_id IN (${eventList});
      DELETE FROM public.platform_audit_log WHERE actor_user_id IN (${list(users)});
      DELETE FROM public.event_memberships WHERE user_id IN (${list(users)});
      DELETE FROM public.events WHERE id IN (${eventList});
      DELETE FROM public.platform_quota_overrides WHERE user_id IN (${list(users)});
      DELETE FROM public.profiles WHERE id IN (${list(users)}); COMMIT;`);
    for (const id of users) await checked(root.auth.admin.deleteUser(id));
    console.log("Removed only this run's local fixture users, events, and audit rows.");
  }
}
