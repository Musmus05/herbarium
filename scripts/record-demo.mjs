// Records the demo walkthrough of docs/demo/SCENARIO.md with headless Edge,
// then edits it like a screen recorder would: a smoothed cursor with click
// ripples, and zooms that follow the action.
//   1. npx supabase start, then reset the demo data (npm run demo:reset)
//   2. npm run build && npx next start -p 3100
//   3. node scripts/record-demo.mjs        -> docs/demo/herbarium-demo.mp4
//   4. npm run demo                        -> web video, poster and README GIF
import { spawn, execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import ffmpeg from "ffmpeg-static";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const BROWSER = process.env.BROWSER ?? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const W = 1440;
const H = 900;
const SCALE = 1.5; // capture density, so zoomed shots stay sharp
const OUT = path.resolve("docs/demo/herbarium-demo.mp4");
const DEMO = { email: "demo@herbarium.test", password: "demo-herbarium-2026" };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const work = await mkdtemp(path.join(os.tmpdir(), "herbarium-demo-"));
const frameDir = path.join(work, "frames");
await mkdir(frameDir);

// ---------------------------------------------------------------------------
// Browser and DevTools protocol

const browser = spawn(BROWSER, [
  "--headless=new",
  "--remote-debugging-port=9334",
  `--user-data-dir=${path.join(work, "profile")}`,
  "--hide-scrollbars",
  "--no-first-run",
  `--window-size=${W},${H}`,
  "about:blank",
]);

let target;
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200);
  try {
    target = (await (await fetch("http://127.0.0.1:9334/json")).json()).find((t) => t.type === "page");
  } catch {
    // Still starting.
  }
}
if (!target) throw new Error("Browser did not start");

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0;
const pending = new Map();
const listeners = new Set();
ws.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  } else listeners.forEach((fn) => fn(msg));
});
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const n = ++id;
    pending.set(n, (msg) => (msg.error ? reject(new Error(`${method}: ${msg.error.message}`)) : resolve(msg.result)));
    ws.send(JSON.stringify({ id: n, method, params }));
  });
const evaluate = async (expression) =>
  (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result.value;

// ---------------------------------------------------------------------------
// Overlay injected in every page: the cursor, click ripples, no dev badge.

const OVERLAY = `(() => {
  const css = document.createElement("style");
  css.textContent = "nextjs-portal{display:none!important}" +
    "#demo-cursor{position:fixed;left:0;top:0;width:26px;height:26px;z-index:2147483647;pointer-events:none;" +
    "transition:transform var(--d,600ms) cubic-bezier(.22,1,.36,1);filter:drop-shadow(0 2px 3px rgba(0,0,0,.28))}" +
    ".demo-ripple{position:fixed;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;border:2px solid #9a6a14;" +
    "z-index:2147483646;pointer-events:none;animation:demo-ripple 520ms ease-out forwards}" +
    "@keyframes demo-ripple{from{transform:scale(.3);opacity:.9}to{transform:scale(1.5);opacity:0}}";
  const mount = () => {
    document.head.appendChild(css);
    const c = document.createElement("div");
    c.id = "demo-cursor";
    c.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M4 2l15 9.5-6.6 1.6-3.7 6.2z" fill="#221f19" stroke="#fbfaf4" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    const last = JSON.parse(sessionStorage.getItem("demo-cursor") || "[720,450]");
    c.style.setProperty("--d", "0ms");
    c.style.transform = "translate(" + last[0] + "px," + last[1] + "px)";
    document.body.appendChild(c);
    window.__cursor = {
      move(x, y, ms) {
        c.style.setProperty("--d", ms + "ms");
        c.style.transform = "translate(" + x + "px," + y + "px)";
        sessionStorage.setItem("demo-cursor", JSON.stringify([x, y]));
      },
      ripple(x, y) {
        const r = document.createElement("div");
        r.className = "demo-ripple";
        r.style.left = x + "px";
        r.style.top = y + "px";
        document.body.appendChild(r);
        setTimeout(() => r.remove(), 600);
      },
    };
  };
  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount);
})();`;

// ---------------------------------------------------------------------------
// Screencast: every frame is saved with its timestamp.

const frames = [];
let t0 = null;
listeners.add(async (msg) => {
  if (msg.method !== "Page.screencastFrame") return;
  const { data, metadata, sessionId } = msg.params;
  const t = metadata.timestamp;
  t0 ??= t;
  const file = path.join(frameDir, `${String(frames.length).padStart(5, "0")}.jpg`);
  frames.push({ file, t: t - t0 });
  writeFile(file, Buffer.from(data, "base64")).catch(() => {});
  send("Page.screencastFrameAck", { sessionId }).catch(() => {});
});
const startedAt = () => (frames.length ? frames[frames.length - 1].t : 0);
const now = () => (performance.now() - recordStart) / 1000;
let recordStart = 0;

// ---------------------------------------------------------------------------
// Actions

let cursor = [720, 450];
const zooms = []; // { t, z, cx, cy } keyframes, cx/cy in 0..1
const chapters = [];

function zoomTo(z, x = cursor[0], y = cursor[1]) {
  zooms.push({ t: now(), z, cx: x / W, cy: y / H });
}

async function open(url) {
  const loaded = new Promise((r) => {
    const fn = (msg) => msg.method === "Page.loadEventFired" && (listeners.delete(fn), r());
    listeners.add(fn);
  });
  await send("Page.navigate", { url: BASE + url });
  await loaded;
  await sleep(400);
}

async function waitForPath(match, timeout = 15000) {
  const test = typeof match === "string" ? (p) => p.startsWith(match) : (p) => match.test(p);
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (test(await evaluate("location.pathname"))) return;
    await sleep(150);
  }
  const where = await evaluate("location.pathname + ' | ' + (document.querySelector('[aria-live]')?.textContent ?? '')");
  throw new Error(`Timed out waiting for ${match}; on ${where}`);
}

async function center(selector) {
  const rect = await evaluate(`(() => {
    const el = ${selector};
    if (!el) return null;
    el.scrollIntoView({ block: "nearest" });
    const r = el.getBoundingClientRect();
    return [Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)];
  })()`);
  if (!rect) throw new Error(`Not found: ${selector}`);
  return rect;
}

async function moveTo([x, y], ms = 700) {
  await evaluate(`window.__cursor && window.__cursor.move(${x}, ${y}, ${ms})`);
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  cursor = [x, y];
  await sleep(ms + 120);
}

async function click(selector, { zoom } = {}) {
  const point = await center(selector);
  await moveTo(point);
  if (zoom) zoomTo(zoom, ...point);
  await sleep(250);
  await evaluate(`window.__cursor && window.__cursor.ripple(${point[0]}, ${point[1]})`);
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: point[0], y: point[1], button: "left", clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: point[0], y: point[1], button: "left", clickCount: 1 });
  await sleep(250);
}

async function type(text, delay = 55) {
  for (const ch of text) {
    await send("Input.insertText", { text: ch });
    await sleep(delay + Math.random() * 40);
  }
}

async function choose(selector, value) {
  const point = await center(selector);
  await moveTo(point);
  await evaluate(`window.__cursor && window.__cursor.ripple(${point[0]}, ${point[1]})`);
  await sleep(200);
  await evaluate(`(() => {
    const el = ${selector};
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(el, ${JSON.stringify(value)});
    el.dispatchEvent(new Event("change", { bubbles: true }));
  })()`);
}

const q = (css) => `document.querySelector(${JSON.stringify(css)})`;
const byText = (tag, text) => `[...document.querySelectorAll(${JSON.stringify(tag)})].find((e) => e.textContent.trim().startsWith(${JSON.stringify(text)}))`;

try {
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: SCALE, mobile: false });
  await send("Page.addScriptToEvaluateOnNewDocument", { source: OVERLAY });

  // Headless browsers render WebGL in software: use the recorded paintings,
  // which are the same p5.brush strokes.
  await open("/");
  await evaluate("localStorage.setItem('herbarium:brush-slow', '1'); sessionStorage.removeItem('demo-cursor')");
  await open("/");

  await send("Page.startScreencast", { format: "jpeg", quality: 88, maxWidth: W * SCALE, maxHeight: H * SCALE, everyNthFrame: 1 });
  recordStart = performance.now();
  zoomTo(1, W / 2, H / 2);

  // Home: the forest paints itself.
  chapters.push(now());
  await moveTo([560, 420], 900);
  await sleep(2600);
  await click(byText("a", "J'ai déjà un compte"), { zoom: 1.35 });
  await waitForPath("/login");
  zoomTo(1, W / 2, H / 2);
  await sleep(900);
  await click(q("#email"), { zoom: 1.4 });
  await type(DEMO.email, 35);
  await click(q("#password"));
  await type(DEMO.password, 30);
  await click(q("button[value=signin]"), { zoom: 1.3 });
  await waitForPath("/app");
  zoomTo(1, W / 2, H / 2);

  // Overview: where applications stand, follow-ups due.
  chapters.push(now());
  await sleep(1400);
  await moveTo(await center(q("#pipeline")), 900);
  zoomTo(1.3);
  await sleep(1800);
  await moveTo(await center(q("#follow-ups")), 800);
  zoomTo(1.35);
  await sleep(2000);
  zoomTo(1, W / 2, H / 2);

  // New application: the specimen grows as it is typed.
  chapters.push(now());
  await click(q("a.rail-ticket"), { zoom: 1.3 });
  await waitForPath("/app/applications/new");
  zoomTo(1, W / 2, H / 2);
  await sleep(900);
  await click(q("#company"), { zoom: 1.45 });
  await type("Jardin des Plantes");
  await click(q("#role"));
  await type("Stage en botanique");
  await click(byText("label", "Recherche"));
  const preview = await center(q("aside[aria-label] figure"));
  await moveTo(preview, 900);
  zoomTo(1.45);
  await sleep(2600);
  await choose(q("#status"), "interview");
  zoomTo(1.45, ...preview);
  await moveTo(preview, 700);
  await sleep(2800);
  await choose(q("#status"), "applied");
  await sleep(600);
  zoomTo(1, W / 2, H / 2);
  await click(q("main form button[type=submit]"), { zoom: 1.3 });
  await waitForPath(new RegExp("^/app/applications/[0-9a-f-]{36}$"));
  zoomTo(1, W / 2, H / 2);

  // The record: its plant paints itself.
  chapters.push(now());
  await sleep(700);
  const plate = await center(q("article aside figure"));
  await moveTo(plate, 900);
  zoomTo(1.4);
  await sleep(2800);
  zoomTo(1, W / 2, H / 2);

  // Updating a status from the list.
  chapters.push(now());
  await click(q('aside a[href="/app/applications"]'));
  await waitForPath("/app/applications");
  await sleep(900);
  const select = `[...document.querySelectorAll("tbody tr")].find((r) => r.textContent.includes("Studio Rivage"))?.querySelector("select")`;
  await moveTo(await center(select), 900);
  zoomTo(1.5);
  await sleep(500);
  await choose(select, "interview");
  await sleep(2200);
  zoomTo(1, W / 2, H / 2);

  // CVs and their response rates.
  chapters.push(now());
  await click(q('aside a[href="/app/cvs"]'));
  await waitForPath("/app/cvs");
  await sleep(800);
  await moveTo(await center(q("#cv-list + ul li")), 900);
  zoomTo(1.35);
  await sleep(2400);
  zoomTo(1, W / 2, H / 2);

  // Analysis: what works.
  chapters.push(now());
  await click(q('aside a[href="/app"]'));
  await waitForPath("/app");
  await sleep(1000);
  await evaluate("window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })");
  await sleep(1500);
  await moveTo([W * 0.6, H * 0.6], 900);
  zoomTo(1.15, W * 0.6, H * 0.62);
  await sleep(3200);
  zoomTo(1, W / 2, H / 2);
  await sleep(1500);

  await send("Page.stopScreencast");
  await sleep(500);
} finally {
  ws.close();
  browser.kill();
}

// ---------------------------------------------------------------------------
// Edit: constant frame rate, then zooms that ease between keyframes.

const duration = startedAt() + 0.5;
const concat = frames
  .map((f, i) => `file '${f.file.replaceAll("\\", "/")}'\nduration ${((frames[i + 1]?.t ?? duration) - f.t).toFixed(4)}`)
  .join("\n");
await writeFile(path.join(work, "frames.txt"), `${concat}\nfile '${frames.at(-1).file.replaceAll("\\", "/")}'\n`);

const raw = path.join(work, "raw.mp4");
execFileSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", path.join(work, "frames.txt"),
  "-vf", `fps=30,scale=${W * SCALE}:${H * SCALE}`, "-c:v", "libx264", "-preset", "veryfast", "-crf", "14", "-pix_fmt", "yuv420p", raw], { stdio: "inherit" });

// Each zoom eases in over 0.9 s from the previous framing.
const EASE = 0.9;
const steps = zooms.map((k) => ({ ...k, t: Math.max(0, k.t) }));
const piece = (key) => {
  let expr = String(steps[0][key]);
  for (let i = 1; i < steps.length; i++) {
    const a = steps[i - 1][key];
    const b = steps[i][key];
    const s = steps[i].t;
    const e = `min(1,max(0,(T-${s.toFixed(3)})/${EASE}))`;
    const smooth = `(${e}*${e}*(3-2*${e}))`;
    expr = `if(lt(T,${s.toFixed(3)}),${expr},${a}+(${b - a})*${smooth})`;
  }
  return expr.replaceAll("T", "(in/30)");
};
const z = piece("z");
const x = `max(0,min(iw-iw/zoom,(${piece("cx")})*iw-iw/zoom/2))`;
const y = `max(0,min(ih-ih/zoom,(${piece("cy")})*ih-ih/zoom/2))`;

await mkdir(path.dirname(OUT), { recursive: true });
execFileSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", "-i", raw,
  "-vf", `zoompan=z='${z}':x='${x}':y='${y}':d=1:s=1920x1200:fps=30,format=yuv420p`,
  "-c:v", "libx264", "-preset", "slow", "-crf", "18", OUT], { stdio: "inherit" });

console.log(`frames: ${frames.length}, duration: ${duration.toFixed(1)} s`);
console.log(`chapters: [${chapters.map((c) => Math.round(c)).join(", ")}]`);
console.log(`saved ${OUT}`);
await rm(work, { recursive: true, force: true }).catch(() => {});
