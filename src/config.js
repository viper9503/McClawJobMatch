// Central config / tunables. Values can be overridden by VITE_ env vars at build
// time, or by the user at runtime via the UI (which persists to localStorage).

const env = import.meta.env ?? {};

// --- McClaw API ----------------------------------------------------------------
// In dev we hit the relative path so Vite's proxy (see vite.config.js) forwards
// to https://mcclaw.io and dodges CORS. To bypass the proxy (e.g. McClaw enables
// CORS), set VITE_MCCLAW_API_BASE to the absolute URL.
export const MCCLAW_API_BASE = env.VITE_MCCLAW_API_BASE || "/api/v1";

// Server-side task proxy (api/tasks.js in prod, mirrored by the Vite dev
// middleware). It injects the agent X-API-Key server-side, so the live board can
// load without ever putting a key in the browser. Returns { tasks: [] } when no
// server key is configured, so the app quietly falls back to the demo board.
export const LIVE_TASKS_URL = env.VITE_LIVE_TASKS_URL || "/api/tasks";

// --- Scoring model -------------------------------------------------------------
// Haiku 4.5: fast + cheap, great for bulk scoring of many jobs in a live demo.
// Sonnet 4.6: more nuanced resume reasoning, ~5x the cost.
export const MODELS = {
  fast: "claude-haiku-4-5",
  quality: "claude-sonnet-4-6",
};
export const DEFAULT_MODEL = env.VITE_SCORING_MODEL || MODELS.fast;

// Don't fire an LLM call for every job if the board is huge — pre-filter
// deterministically and only score the top N. The rest still show their cheap
// pre-score so nothing silently disappears.
export const MAX_LLM_JOBS = Number(env.VITE_MAX_LLM_JOBS) || 25;

// How many scoring calls to run at once. The first call runs alone to warm the
// prompt cache (resume+profile prefix), then the rest fan out at this width.
export const SCORE_CONCURRENCY = Number(env.VITE_SCORE_CONCURRENCY) || 5;

// Pre-filled keys (optional convenience — see .env.example).
export const ENV_ANTHROPIC_KEY = env.VITE_ANTHROPIC_API_KEY || "";
export const ENV_MCCLAW_KEY = env.VITE_MCCLAW_API_KEY || "";

// localStorage keys.
export const LS = {
  anthropicKey: "mcclaw.anthropicKey",
  mcclawKey: "mcclaw.mcclawKey",
  model: "mcclaw.model",
  profile: "mcclaw.profile",
  resumeText: "mcclaw.resumeText",
  resumeName: "mcclaw.resumeName",
  applied: "mcclaw.applied",
  jobStatus: "mcclaw.jobStatus",
};
