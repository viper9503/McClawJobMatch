// Adapter that drives the Claude scorer (scorer.js) from the product UI's
// profile + task shapes, and maps the structured LLM output back into the
// { total, matched, missing, source, rationale, ... } shape the cards render.
//
// Also does a cheap, no-API pre-rank so that when we cap how many tasks get
// AI-scored, the most relevant ones go first (and a cancel still leaves the best
// ones done).

import { scoreJobs } from "./scorer.js";
import { DEFAULT_MODEL } from "../config.js";

const STOP = new Set(
  ("a an the and or to of in on for with without your you our we i me my their they " +
    "them this that these those will can do does is are be as at by from it its into " +
    "each one ten twenty fifty hundred please review make them feel more so it sound " +
    "task tasks work based how that")
    .split(/\s+/),
);

function tokenize(s) {
  return new Set(
    String(s || "")
      .toLowerCase()
      .split(/[^a-z0-9+#]+/)
      .filter((w) => w.length > 2 && !STOP.has(w)),
  );
}

/** Build resume text + a scorer-shaped profile from the product profile. */
export function buildResumeContext(profile) {
  const skills = [
    ...(profile?.skills || []),
    ...(profile?.certifications || []),
    ...(profile?.coursework || []),
  ]
    .map((s) => String(s).toLowerCase())
    .filter(Boolean);

  const scorerProfile = {
    name: profile?.name || "You",
    location: profile?.anyLocation ? "anywhere" : profile?.location || "",
    remoteOk: profile?.remoteOk ?? true,
    years: profile?.years ?? 0,
    skills,
    titles: [],
    summary: summarize(profile, skills),
  };

  const resumeText = (profile?.resumeText || "").trim() || synthResume(profile, skills);
  return { resumeText, scorerProfile };
}

function summarize(profile, skills) {
  const bits = [];
  if (profile?.years != null) bits.push(`${profile.years} yrs experience`);
  if (profile?.location) bits.push(`based in ${profile.location}`);
  if (profile?.remoteOk) bits.push("open to remote");
  if (profile?.hoursPerWeek) bits.push(`~${profile.hoursPerWeek}h/week available`);
  if (skills.length) bits.push(`skills: ${skills.slice(0, 12).join(", ")}`);
  return bits.join("; ");
}

function synthResume(profile, skills) {
  return [
    `${profile?.name || "Candidate"} — ${profile?.location || "location N/A"}.`,
    profile?.years != null ? `${profile.years} years of experience.` : "",
    skills.length ? `Skills: ${skills.join(", ")}.` : "",
    (profile?.coursework || []).length ? `Coursework: ${profile.coursework.join(", ")}.` : "",
    (profile?.projects || []).length ? `Projects: ${profile.projects.join(", ")}.` : "",
    profile?.remoteOk ? "Open to remote work." : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function preRank({ skills, resumeText }, tasks) {
  const hay = new Set([...skills, ...tokenize(resumeText)]);
  return tasks
    .map((t) => {
      const toks = tokenize(`${t.title} ${t.desc}`);
      let overlap = 0;
      toks.forEach((x) => hay.has(x) && (overlap += 1));
      return { t, s: toks.size ? overlap / toks.size : 0 };
    })
    .sort((a, b) => b.s - a.s)
    .map((x) => x.t);
}

function mergeResult(llm) {
  return {
    total: llm.match_score,
    matched: llm.matched_skills || [],
    missing: llm.missing_skills || [],
    gated: false,
    source: "ai",
    oneLiner: llm.one_liner || "",
    rationale: llm.rationale || "",
    recommendation: llm.recommendation || "stretch",
    category: llm.extracted?.category || "",
    remote: llm.extracted?.remote,
    pros: llm.pros || [],
    cons: llm.cons || [],
  };
}

/**
 * Score tasks against the profile with Claude. Streams each result via onResult.
 * @returns {Promise<number>} how many tasks were scored.
 */
export async function scoreTasksWithAI(
  apiKey,
  model,
  profile,
  tasks,
  { limit, onResult, onProgress, signal } = {},
) {
  const { resumeText, scorerProfile } = buildResumeContext(profile);
  const ordered = preRank({ skills: scorerProfile.skills, resumeText }, tasks);
  const slice = limit ? ordered.slice(0, limit) : ordered;

  const jobs = slice.map((t) => ({
    id: t.id,
    title: t.title,
    agent: t.agent,
    description: t.desc,
    pay: t.pay,
    payNet: t.payout,
    deadline: null,
    location: t.location,
    remote: t.remote,
  }));

  await scoreJobs(
    apiKey,
    model || DEFAULT_MODEL,
    { profile: scorerProfile, resumeText, jobs },
    {
      signal,
      onProgress,
      onResult: (_i, res, job) =>
        onResult?.(job.id, res.error ? { error: res.error } : mergeResult(res.llm)),
    },
  );

  return slice.length;
}
