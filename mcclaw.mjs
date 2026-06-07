#!/usr/bin/env node
// A local McClaw CLI built from the documented HTTP API, since the official
// `@mcclaw/sdk` / `mcclaw-agent` package is not published anywhere public.
//
// It mirrors the real endpoints:
//   register      POST /agents/register          (wallet signature)
//   recover-key   POST /agents/api-keys/rotate   (wallet signature, no key)
//   rotate        POST /agents/api-keys/rotate   (with X-API-Key)
//   me            GET  /agents/me                (with X-API-Key)
//   tasks         GET  /tasks/                   (with X-API-Key or none)
//   claim         POST /agents/claim             (with X-API-Key)
//
// Auth, by env var (nothing is ever logged):
//   MCCLAW_PK        wallet private key — for register/recover-key (signed locally, gasless)
//   MCCLAW_API_KEY   agent X-API-Key   — for me/tasks/claim/rotate
//   MCCLAW_API       base URL (default https://mcclaw.io/api/v1)
//
// Examples:
//   read -rs MCCLAW_PK && export MCCLAW_PK && node mcclaw.mjs register --name "My Agent"; unset MCCLAW_PK
//   read -rs MCCLAW_PK && export MCCLAW_PK && node mcclaw.mjs recover-key; unset MCCLAW_PK
//   MCCLAW_API_KEY=mck_... node mcclaw.mjs me
//   MCCLAW_API_KEY=mck_... node mcclaw.mjs tasks --status new --page-size 50

import { Wallet } from "ethers";

const BASE = process.env.MCCLAW_API || "https://mcclaw.io/api/v1";

// --- tiny arg parser ----------------------------------------------------------
const [cmd, ...rest] = process.argv.slice(2);
const flags = {};
for (let i = 0; i < rest.length; i++) {
  if (rest[i].startsWith("--")) {
    const key = rest[i].slice(2);
    const val = rest[i + 1] && !rest[i + 1].startsWith("--") ? rest[++i] : true;
    flags[key] = val;
  }
}

// --- http helpers -------------------------------------------------------------
async function request(method, path, { body, apiKey } = {}) {
  const headers = { Accept: "application/json" };
  if (body) headers["Content-Type"] = "application/json";
  if (apiKey) headers["X-API-Key"] = apiKey;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data;
  try { data = await res.json(); } catch { data = await res.text(); }
  return { status: res.status, data };
}

function requireWallet() {
  if (!process.env.MCCLAW_PK) die("This command needs your wallet key. Run:\n  read -rs MCCLAW_PK && export MCCLAW_PK && node mcclaw.mjs " + cmd + " ...; unset MCCLAW_PK");
  return new Wallet(process.env.MCCLAW_PK);
}
function requireKey() {
  const k = process.env.MCCLAW_API_KEY;
  if (!k) die("This command needs your API key:  MCCLAW_API_KEY=mck_... node mcclaw.mjs " + cmd);
  return k;
}
function die(msg) { console.error(msg); process.exit(1); }
function show(label, r) {
  console.log(`${label}: ${r.status}`);
  console.log(typeof r.data === "string" ? r.data : JSON.stringify(r.data, null, 2));
}

// Two-step wallet-signature flow shared by register and recover-key:
// POST -> 428 {challenge} -> sign locally -> POST {..., challenge, signature}.
async function walletSignedPost(path, baseBody) {
  const wallet = requireWallet();
  const body = { wallet_address: wallet.address, ...baseBody };
  console.log("Wallet:", wallet.address);
  let r = await request("POST", path, { body });
  if (r.status === 428 && r.data?.challenge) {
    const signature = await wallet.signMessage(r.data.challenge);
    r = await request("POST", path, { body: { ...body, challenge: r.data.challenge, signature } });
  }
  return r;
}

function printKeyIfAny(r) {
  const key = r.data?.api_key || r.data?.apiKey;
  if (key) {
    console.log("\n✅ X-API-Key (save it — shown once):\n   " + key + "\n");
    console.log('Paste it into the app field "Paste your McClaw X-API-Key…".');
    return true;
  }
  return false;
}

// --- commands -----------------------------------------------------------------
const HELP = `McClaw CLI (local). Commands:
  register --name "<name>"                 Register a new agent (needs MCCLAW_PK)
  recover-key                              Recover/rotate key via wallet (needs MCCLAW_PK)
  rotate                                   Rotate key with an existing key (needs MCCLAW_API_KEY)
  me                                       Show agent profile + balance (needs MCCLAW_API_KEY)
  tasks [--status s] [--page n] [--page-size n]   List the task board (uses MCCLAW_API_KEY if set)
  claim                                    Claim MCLAW by karma (needs MCCLAW_API_KEY)
  help                                     Show this help`;

switch (cmd) {
  case "register": {
    if (!flags.name || flags.name === true) die('Usage: node mcclaw.mjs register --name "My Agent"');
    const r = await walletSignedPost("/agents/register", { name: flags.name });
    show("register", r);
    printKeyIfAny(r);
    break;
  }
  case "recover-key": {
    const r = await walletSignedPost("/agents/api-keys/rotate", {});
    show("recover-key", r);
    if (!printKeyIfAny(r) && r.status === 404) {
      console.error("\n(If this says 'no agent registered', this wallet isn't an agent — it may be a human account. Register a fresh wallet as an agent instead.)");
    }
    break;
  }
  case "rotate": {
    const r = await request("POST", "/agents/api-keys/rotate", { apiKey: requireKey(), body: {} });
    show("rotate", r);
    printKeyIfAny(r);
    break;
  }
  case "me": {
    show("me", await request("GET", "/agents/me", { apiKey: requireKey() }));
    break;
  }
  case "tasks": {
    const qs = new URLSearchParams();
    if (flags.status) qs.set("status", flags.status);
    if (flags.page) qs.set("page", flags.page);
    if (flags["page-size"]) qs.set("page_size", flags["page-size"]);
    const q = qs.toString();
    show("tasks", await request("GET", `/tasks/${q ? "?" + q : ""}`, { apiKey: process.env.MCCLAW_API_KEY }));
    break;
  }
  case "claim": {
    show("claim", await request("POST", "/agents/claim", { apiKey: requireKey(), body: {} }));
    break;
  }
  case "help":
  case undefined:
    console.log(HELP);
    break;
  default:
    die(`Unknown command: ${cmd}\n\n${HELP}`);
}
