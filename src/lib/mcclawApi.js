// McClaw API client (the "human" side of the marketplace).
//
// Discovered from https://mcclaw.io/skill.md and https://docs.mcclaw.io:
//   Base:    https://mcclaw.io/api/v1   (we hit /api/v1 via the Vite dev proxy)
//   Auth:    X-API-Key header (agent key) OR session cookie (human)
//   Feed:    GET /tasks/        -> the task board; supports status, page, pageSize
//   Single:  GET /tasks/{id}/
//
// Task object (from the docs' create example + the human guide):
//   { id, agent_id, title, description, status,
//     escrow_amount (wei string, 18-dec $MCLAW), fee_percent, deadline (RFC3339?) }
//
// Real tasks have NO structured skills/location/years — just title + free-text
// description. That's by design: the LLM scorer extracts requirements from the
// description. We normalize whatever we get into a single Job shape the rest of
// the app understands.

import { MCCLAW_API_BASE, LIVE_TASKS_URL } from "../config.js";

const MCLAW_DECIMALS = 18n;

/** Convert an escrow wei string (e.g. "10000000000000000000") to a $MCLAW number. */
function weiToMclaw(wei) {
  if (wei == null || wei === "") return 0;
  try {
    const v = BigInt(String(wei).trim());
    const whole = v / 10n ** MCLAW_DECIMALS;
    const frac = v % 10n ** MCLAW_DECIMALS;
    // Keep a little fractional precision without floating-point surprises.
    return Number(whole) + Number(frac) / 1e18;
  } catch {
    const n = Number(wei);
    return Number.isFinite(n) ? n : 0;
  }
}

/** Net payout to the human after McClaw's platform fee. */
function netPay(grossMclaw, feePercent) {
  const fee = Number(feePercent);
  if (!Number.isFinite(fee) || fee <= 0) return grossMclaw;
  return grossMclaw * (1 - fee / 100);
}

/**
 * Normalize one raw McClaw task into the app's Job shape.
 * Unknown structured fields (location/remote/skills/minYears) are left undefined
 * on purpose — the LLM fills them in from the description.
 */
export function normalizeTask(t) {
  const grossMclaw = weiToMclaw(t.escrow_amount ?? t.escrowAmount ?? t.pay);
  const fee = t.fee_percent ?? t.feePercent;
  const status = String(t.status || "new");
  const net = round2(netPay(grossMclaw, fee));
  return {
    id: String(t.id ?? t.task_id ?? cryptoRandomId()),
    title: t.title || t.name || "Untitled gig",
    agent: String(t.agent_id || t.agent || t.agentId || t.employer || "Unknown Agent"),
    // Funded/active => escrow is locked on-chain => treat the poster as verified.
    verified: /fund|active|approved|released/i.test(status),
    // The UI and the LLM scorer both read `desc` — keep that name.
    desc: t.description || t.details || t.body || "",
    status,
    pay: round2(grossMclaw), // gross reward in $MCLAW
    payout: net, // net to the human after the platform fee (scorer reads `payout`)
    payNet: net, // alias kept for any older callers
    feePercent: fee != null ? Number(fee) : undefined,
    deadline: t.deadline || t.due || t.expires_at || null,
    // Real McClaw tasks carry no structured skills/location/schedule — Claude
    // infers them from the description at scoring time. We default them so the
    // heuristic fallback and the filters still behave before/without the LLM.
    skills: Array.isArray(t.skills) ? t.skills : [],
    location: t.location ?? "Remote",
    remote: t.remote ?? true,
    minYears: t.min_years ?? t.minYears ?? 0,
    minReputation: t.min_reputation ?? t.minReputation ?? 0,
    schedule: t.schedule ?? "async",
    timeCommitmentHours: t.time_commitment_hours ?? t.timeCommitmentHours ?? 1,
    source: "mcclaw",
    raw: t,
  };
}

/**
 * Fetch the open task board. Returns normalized Jobs.
 * @param {object} opts
 * @param {string} [opts.apiKey]  X-API-Key. If omitted, relies on a session cookie.
 * @param {string} [opts.status]  Defaults to "new" (open gigs humans can apply to).
 * @param {number} [opts.pageSize]
 * @param {AbortSignal} [opts.signal]
 */
export async function fetchOpenTasks({
  apiKey,
  status = "new",
  pageSize = 100,
  page = 1,
  signal,
} = {}) {
  const url = new URL(`${MCCLAW_API_BASE}/tasks/`, window.location.origin);
  // The docs only pin `page` and `page_size` (snake_case, max 100). `status` is
  // sent as a hint; if the server validates params strictly we may need to drop
  // it and filter client-side instead.
  if (status) url.searchParams.set("status", status);
  if (pageSize) url.searchParams.set("page_size", String(Math.min(pageSize, 100)));
  if (page) url.searchParams.set("page", String(page));

  const headers = { Accept: "application/json" };
  if (apiKey) headers["X-API-Key"] = apiKey;

  // Fetch the full href: for the default relative base this is
  // `${origin}/api/v1/tasks/...` (same as the proxied path); for an absolute
  // VITE_MCCLAW_API_BASE override it correctly preserves the mcclaw.io host.
  const res = await fetch(url.href, {
    method: "GET",
    headers,
    credentials: "include", // allow the human session cookie if present
    signal,
  });

  if (!res.ok) {
    const body = await safeText(res);
    throw new McclawError(
      `McClaw API ${res.status} ${res.statusText}` + (body ? ` — ${body}` : ""),
      res.status,
      res.headers.get("retry-after"),
    );
  }

  const data = await res.json();
  const tasks = extractTaskArray(data);

  // Guarantee unique ids: they key both the results map and React list keys, so
  // a duplicate from the feed would clobber a score and warn on render.
  const seen = new Set();
  return tasks.map((t, i) => {
    const job = normalizeTask(t);
    if (seen.has(job.id)) job.id = `${job.id}-${i}`;
    seen.add(job.id);
    return job;
  });
}

/**
 * Fetch the live board via the **server-side proxy** (`api/tasks.js` in prod,
 * mirrored by the Vite dev middleware) instead of a browser-held key. The proxy
 * injects the agent X-API-Key server-side, so — unlike {@link fetchOpenTasks} —
 * no key ever touches the browser bundle. Resolves to `[]` when no server key is
 * configured (the proxy answers `{ tasks: [] }`), letting the app fall back to
 * the demo board. Returns normalized Jobs.
 * @param {object} opts
 * @param {AbortSignal} [opts.signal]
 */
export async function fetchProxyTasks({ signal } = {}) {
  const res = await fetch(LIVE_TASKS_URL, {
    method: "GET",
    headers: { Accept: "application/json" },
    // Never let the browser serve a stale cached board — e.g. an empty
    // `{tasks:[]}` from before the server key was configured. The CDN still
    // caches briefly (s-maxage in api/tasks.js); this only affects the browser.
    cache: "no-store",
    signal,
  });
  if (!res.ok) {
    const body = await safeText(res);
    throw new McclawError(
      `McClaw proxy ${res.status} ${res.statusText}` + (body ? ` — ${body}` : ""),
      res.status,
      res.headers.get("retry-after"),
    );
  }
  const data = await res.json();
  const tasks = extractTaskArray(data);

  // Same unique-id guard as fetchOpenTasks: ids key both the score map and the
  // React list, so a duplicate from the feed would clobber a score on render.
  const seen = new Set();
  return tasks.map((t, i) => {
    const job = normalizeTask(t);
    if (seen.has(job.id)) job.id = `${job.id}-${i}`;
    seen.add(job.id);
    return job;
  });
}

// --- Public config endpoints (no auth) ----------------------------------------
// These are the only McClaw API endpoints reachable without an agent key or a
// human session cookie, so they're what a frontend-only app can call live.

/** Real McClaw skill taxonomy: [{ name, skills: [...] }]. */
export async function fetchSkillCategories({ signal } = {}) {
  const res = await fetch(`${MCCLAW_API_BASE}/config/skills`, {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!res.ok) throw new McclawError(`McClaw /config/skills ${res.status}`, res.status);
  const data = await res.json();
  return Array.isArray(data?.categories) ? data.categories : [];
}

/** Live location search (geonames). Returns [{ name, subcountry, country }]. */
export async function searchLocations(q, { signal } = {}) {
  if (!q || q.trim().length < 2) return [];
  const res = await fetch(
    `${MCCLAW_API_BASE}/config/locations?q=${encodeURIComponent(q.trim())}`,
    { headers: { Accept: "application/json" }, signal },
  );
  if (!res.ok) throw new McclawError(`McClaw /config/locations ${res.status}`, res.status);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export class McclawError extends Error {
  constructor(message, status, retryAfter) {
    super(message);
    this.name = "McclawError";
    this.status = status;
    this.retryAfter = parseRetryAfter(retryAfter);
  }
}

// Retry-After is either delta-seconds ("120") or an HTTP-date (RFC 7231).
function parseRetryAfter(v) {
  if (!v) return undefined;
  const secs = Number(v);
  if (Number.isFinite(secs)) return secs;
  const ts = Date.parse(v);
  return Number.isFinite(ts) ? Math.max(0, (ts - Date.now()) / 1000) : undefined;
}

// --- helpers -------------------------------------------------------------------

// The exact list-response envelope isn't pinned in the public docs, so accept
// the common shapes: a bare array, or { data | tasks | results | items: [...] }.
function extractTaskArray(data) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    for (const key of ["data", "tasks", "results", "items"]) {
      if (Array.isArray(data[key])) return data[key];
    }
  }
  return [];
}

async function safeText(res) {
  try {
    const t = await res.text();
    return t?.slice(0, 300);
  } catch {
    return "";
  }
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function cryptoRandomId() {
  try {
    return crypto.randomUUID();
  } catch {
    return "task-" + Math.random().toString(36).slice(2);
  }
}

