// LLM scoring with Claude.
//
// Design:
//  - Structured output via FORCED TOOL USE (tool_choice: {type:"tool"}). This is
//    rock-solid across SDK versions and needs no schema-compilation step — the
//    model must return a tool_use block whose `input` matches our schema.
//  - PROMPT CACHING: the candidate dossier (profile + resume) + instructions go
//    in a cached `system` block. Only the per-job content varies, so every job
//    after the first reads the cached prefix (~0.1x input cost). The first call
//    runs alone to warm the cache; the rest fan out concurrently.
//  - Model: caller passes the id (Haiku 4.5 by default — fast + cheap).

import { getClient, toolInputFromResponse } from "./anthropic.js";
import { SCORE_CONCURRENCY } from "../config.js";

// ---------------------------------------------------------------------------
// Resume → structured profile (one call; auto-fills the profile panel)
// ---------------------------------------------------------------------------

const PROFILE_SYSTEM =
  "You parse a human's resume into a compact structured profile for a gig-matching app. " +
  "Extract only what the resume supports; do not invent. Skills should be short, lowercased tags " +
  "(e.g. \"photography\", \"python\", \"customer-service\"). Estimate total years of professional " +
  "experience as a number. Use the submit_profile tool.";

const PROFILE_TOOL = {
  name: "submit_profile",
  description: "Return the structured candidate profile parsed from the resume.",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Candidate name if present, else empty string." },
      location: { type: "string", description: "City/region if stated, else empty string." },
      remote_ok: { type: "boolean", description: "Whether the candidate appears open to remote work." },
      years_experience: { type: "number", description: "Estimated total years of professional experience." },
      skills: { type: "array", items: { type: "string" }, description: "Short lowercase skill tags." },
      titles: { type: "array", items: { type: "string" }, description: "Past/role titles." },
      summary: { type: "string", description: "One-sentence summary of the candidate." },
    },
    required: ["skills", "years_experience"],
  },
};

export async function parseResume(apiKey, model, resumeText, { signal } = {}) {
  const client = getClient(apiKey);
  const res = await client.messages.create(
    {
      model,
      max_tokens: 1024,
      system: PROFILE_SYSTEM,
      tools: [PROFILE_TOOL],
      tool_choice: { type: "tool", name: "submit_profile" },
      messages: [{ role: "user", content: `RESUME:\n\n${truncate(resumeText, 24000)}` }],
    },
    { signal },
  );
  return normalizeProfile(toolInputFromResponse(res, "submit_profile"));
}

// ---------------------------------------------------------------------------
// Job scoring (many calls, shared cached prefix)
// ---------------------------------------------------------------------------

const SCORE_INSTRUCTIONS =
  "You are the matching engine for McClaw, a marketplace where AI agents post gigs and HUMANS do the work.\n" +
  "Given a human candidate (resume + parsed profile) and one gig, judge how well THIS human fits THIS gig.\n" +
  "Score only on skills, relevant experience, and logistics (location/remote, time, deadline). Never consider " +
  "identity or protected attributes.\n" +
  "Real gigs are free text with no structured requirements — infer the required skills, location, remote-ness, " +
  "and minimum years from the title and description, and report them in `extracted`.\n" +
  "Be honest and calibrated: most candidates are not a strong fit for most gigs. Ground every claim in the resume.\n" +
  "Always respond by calling the submit_score tool.";

const SCORE_TOOL = {
  name: "submit_score",
  description: "Return the match assessment for this candidate-vs-gig pair.",
  input_schema: {
    type: "object",
    properties: {
      match_score: {
        type: "integer",
        description: "0–100 overall fit of this human for this gig. Be calibrated, not generous.",
      },
      recommendation: {
        type: "string",
        enum: ["strong", "good", "stretch", "skip"],
        description: "Bucketed verdict.",
      },
      one_liner: { type: "string", description: "<=120 char punchy verdict." },
      rationale: { type: "string", description: "2–3 sentences explaining the score, grounded in the resume." },
      matched_skills: { type: "array", items: { type: "string" }, description: "Required skills the candidate clearly has." },
      missing_skills: { type: "array", items: { type: "string" }, description: "Required skills the candidate lacks or didn't show." },
      extracted: {
        type: "object",
        description: "Requirements inferred from the gig text.",
        properties: {
          required_skills: { type: "array", items: { type: "string" } },
          location: { type: "string", description: "Inferred location, or empty if remote/unspecified." },
          remote: { type: "boolean" },
          min_years: { type: "integer", description: "Inferred minimum years of experience (0 if none)." },
          category: { type: "string", description: "Short gig category, e.g. \"photography\", \"physical-errand\"." },
        },
        required: ["required_skills", "remote", "min_years"],
      },
      pros: { type: "array", items: { type: "string" }, description: "Up to 3 reasons this is a good match." },
      cons: { type: "array", items: { type: "string" }, description: "Up to 3 risks or gaps." },
    },
    required: [
      "match_score",
      "recommendation",
      "one_liner",
      "rationale",
      "matched_skills",
      "missing_skills",
      "extracted",
    ],
  },
};

/** Build the cached system prefix shared by every job-scoring call. */
function buildScoringSystem(profile, resumeText) {
  const dossier =
    "CANDIDATE PROFILE (parsed):\n" +
    JSON.stringify(
      {
        name: profile?.name || "",
        location: profile?.location || "",
        remote_ok: profile?.remoteOk ?? null,
        years_experience: profile?.years ?? null,
        skills: profile?.skills || [],
        titles: profile?.titles || [],
        summary: profile?.summary || "",
      },
      null,
      2,
    ) +
    "\n\nCANDIDATE RESUME (verbatim):\n" +
    truncate(resumeText || "(no resume provided)", 24000);

  return [
    { type: "text", text: SCORE_INSTRUCTIONS },
    // Stable across all job calls → cache it. Cheap reads for every job after #1.
    { type: "text", text: dossier, cache_control: { type: "ephemeral" } },
  ];
}

function jobToUserContent(job) {
  const lines = [`GIG: ${job.title}`, `Posted by agent: ${job.agent}`];
  if (job.pay != null) {
    lines.push(
      `Pay: ${job.pay} $MCLAW` +
        (job.payNet != null && job.payNet !== job.pay ? ` (≈${job.payNet} after fee)` : ""),
    );
  }
  if (job.deadline) lines.push(`Deadline: ${job.deadline}`);
  // Pass through any structured fields that exist (sample/spreadsheet rows).
  if (job.location != null) lines.push(`Location: ${job.location}`);
  if (job.remote != null) lines.push(`Remote: ${job.remote ? "yes" : "no"}`);
  if (job.minYears != null) lines.push(`Stated min years: ${job.minYears}`);
  if (job.skills != null) lines.push(`Stated skills: ${formatSkills(job.skills)}`);
  lines.push("", "Description:", job.description || "(no description provided)");
  return lines.join("\n");
}

async function scoreOne(client, model, system, job, signal) {
  const res = await client.messages.create(
    {
      model,
      max_tokens: 1024,
      system,
      tools: [SCORE_TOOL],
      tool_choice: { type: "tool", name: "submit_score" },
      messages: [{ role: "user", content: jobToUserContent(job) }],
    },
    { signal },
  );
  return normalizeScore(toolInputFromResponse(res, "submit_score"));
}

/**
 * Score a list of jobs against the candidate.
 * @returns {Promise<Array<{job, llm, error}>>} same order as `jobs`.
 */
export async function scoreJobs(
  apiKey,
  model,
  { profile, resumeText, jobs },
  { onProgress, onResult, signal } = {},
) {
  const client = getClient(apiKey);
  const system = buildScoringSystem(profile, resumeText);
  const results = new Array(jobs.length);
  let done = 0;

  const runOne = async (job, i) => {
    let result;
    try {
      result = { job, llm: await scoreOne(client, model, system, job, signal), error: null };
    } catch (err) {
      // User cancelled: leave the job un-scored (it keeps its pre-score) rather
      // than flooding the board with bogus "couldn't score" error cards.
      if (signal?.aborted) return;
      result = { job, llm: null, error: err };
    }
    results[i] = result;
    done += 1;
    onResult?.(i, result, job); // stream each score to the UI as it lands
    onProgress?.(done, jobs.length);
  };

  if (jobs.length === 0) return results;

  // Warm the cache with the first job alone, then fan the rest out. (Parallel
  // requests with an identical prefix all miss the cache; serializing the first
  // lets every subsequent call read what it wrote.)
  await runOne(jobs[0], 0);
  if (signal?.aborted) return results;
  await mapLimit(jobs.slice(1), SCORE_CONCURRENCY, (job, idx) => runOne(job, idx + 1), signal);
  return results;
}

// ---------------------------------------------------------------------------
// Normalizers (defensive — never trust a model to be perfectly schema-shaped)
// ---------------------------------------------------------------------------

function normalizeProfile(p = {}) {
  return {
    name: str(p.name),
    location: str(p.location),
    remoteOk: typeof p.remote_ok === "boolean" ? p.remote_ok : true,
    years: num(p.years_experience, 0),
    skills: arr(p.skills).map((s) => str(s).toLowerCase()).filter(Boolean),
    titles: arr(p.titles).map(str).filter(Boolean),
    summary: str(p.summary),
  };
}

function normalizeScore(s = {}) {
  const ex = s.extracted || {};
  return {
    match_score: clamp(Math.round(num(s.match_score, 0)), 0, 100),
    recommendation: ["strong", "good", "stretch", "skip"].includes(s.recommendation)
      ? s.recommendation
      : "stretch",
    one_liner: str(s.one_liner),
    rationale: str(s.rationale),
    matched_skills: arr(s.matched_skills).map(str).filter(Boolean),
    missing_skills: arr(s.missing_skills).map(str).filter(Boolean),
    extracted: {
      required_skills: arr(ex.required_skills).map(str).filter(Boolean),
      location: str(ex.location),
      remote: typeof ex.remote === "boolean" ? ex.remote : undefined,
      min_years: Number.isFinite(ex.min_years) ? ex.min_years : undefined,
      category: str(ex.category),
    },
    pros: arr(s.pros).map(str).filter(Boolean).slice(0, 3),
    cons: arr(s.cons).map(str).filter(Boolean).slice(0, 3),
  };
}

// ---------------------------------------------------------------------------
// small utils
// ---------------------------------------------------------------------------

async function mapLimit(items, limit, fn, signal) {
  let cursor = 0;
  const width = Math.max(1, Math.min(limit, items.length));
  const workers = Array.from({ length: width }, async () => {
    while (cursor < items.length) {
      if (signal?.aborted) return; // stop dispatching new work once cancelled
      const i = cursor++;
      await fn(items[i], i);
    }
  });
  await Promise.all(workers);
}

function truncate(s, max) {
  const str = String(s ?? "");
  return str.length > max ? str.slice(0, max) + "\n…(truncated)" : str;
}

function formatSkills(s) {
  return Array.isArray(s) ? s.join(", ") : String(s);
}

const str = (x) => (x == null ? "" : String(x)).trim();
const num = (x, d = 0) => (Number.isFinite(Number(x)) ? Number(x) : d);
const arr = (x) => (Array.isArray(x) ? x : []);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
