// Instant, no-API matching logic. This is the fallback the cards render before
// (or without) Claude: a weighted heuristic score, the scam-refusal guard, the
// tiering/difficulty buckets, and a keyword resume parser.
import { TrendingUp, Flame, Mountain } from "lucide-react";

const WEIGHTS = { skills: 0.4, location: 0.15, experience: 0.15, availability: 0.15, reputation: 0.15 };
const COURSE = { spanish: ["spanish", "translation"], "creative writing": ["writing"], "intro to photography": ["photography"] };
const clamp = (n) => Math.max(0, Math.min(1, n));
const norm = (s) => String(s || "").trim().toLowerCase();

function effSkills(p) {
  const s = new Set((p.skills || []).map(norm));
  (p.certifications || []).forEach((c) => s.add(norm(c)));
  for (const c of p.coursework || []) (COURSE[norm(c)] || []).forEach((x) => s.add(x));
  return s;
}

// Weighted heuristic match of a profile against a task. Returns a 0-100 total
// plus the matched/missing skills and whether a reputation gate blocks it.
export function scoreTask(p, t) {
  const have = effSkills(p), need = (t.skills || []).map(norm);
  const matched = need.filter((s) => have.has(s)), missing = need.filter((s) => !have.has(s));
  const skills = need.length ? matched.length / need.length : 0;
  let location;
  if (t.remote) location = 1;
  else if (p.anyLocation) location = 1;
  else { const locs = [p.location, ...(p.locations || [])].map(norm); location = locs.includes(norm(t.location)) ? 1 : p.remoteOk ? 0.35 : 0.1; }
  const experience = (p.years || 0) >= (t.minYears || 0) ? 1 : clamp(1 - ((t.minYears || 0) - (p.years || 0)) / 4);
  const availability = t.schedule === "async" || t.schedule === "flexible" ? 1 : clamp((p.hoursPerWeek || 0) / (t.timeCommitmentHours || 1));
  const reputation = clamp((p.reputation || 0) / 100), gated = (p.reputation || 0) < (t.minReputation || 0);
  let total = WEIGHTS.skills * skills + WEIGHTS.location * location + WEIGHTS.experience * experience + WEIGHTS.availability * availability + WEIGHTS.reputation * reputation;
  if (gated) total *= 0.55;
  // Live tasks have no structured category until Claude infers one; the AI score
  // (m.category) carries the category boost instead, so keep this empty here.
  const cat = t.category || "";
  if (p.categories && p.categories.length && cat && p.categories.includes(cat)) total = Math.min(1, total + 0.06);
  if (p.wants) {
    const ws = p.wants.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3);
    const hay = `${t.title} ${(t.skills || []).join(" ")} ${cat || ""}`.toLowerCase();
    if (ws.some((w) => hay.includes(w))) total = Math.min(1, total + 0.04);
  }
  return { total: Math.round(total * 100), matched, missing, gated, source: "heuristic" };
}

/** Use Claude's result for a task if we have one, else the instant heuristic. */
export function getScore(task, profile, scores) {
  const ai = scores?.[task.id];
  if (ai && !ai.error && ai.total != null) return ai;
  return profile ? scoreTask(profile, task) : null;
}

// --- Refusal guard: tasks your agent declines on your behalf ------------------
const RED = [/\b(password|credential|verification code|otp|sms code)\b/i, /\b(pretend to be|impersonate|pose as)\b/i, /\b(bypass|launder|fake id|forged)\b/i];
export const isRefuse = (t) => RED.some((r) => r.test(`${t.title} ${t.desc}`));

// --- Tiering / difficulty -----------------------------------------------------
export const TIERS = [
  { key: "likely", label: "Most likely", icon: TrendingUp, blurb: "Strong fit and you clear the bar — apply now." },
  { key: "reach", label: "Reach", icon: Flame, blurb: "Within range with a solid application." },
  { key: "stretch", label: "Stretch", icon: Mountain, blurb: "Worth leveling up your reputation or skills for." },
];
export function tierOf(m) {
  if (!m.gated && m.total >= 72) return "likely";
  if (!m.gated && m.total >= 52) return "reach";
  return "stretch";
}
const DIFF_MAP = { easy: { key: "likely", label: "Easy" }, mid: { key: "reach", label: "Competitive" }, hard: { key: "stretch", label: "Hard" } };

// How attainable this task is for YOU (fit + gate). Falls back to the task's
// intrinsic bar (required reputation + experience) when there's no score.
export function difficultyOf(task, profile, scores) {
  const m = getScore(task, profile, scores);
  let level;
  if (m) level = !m.gated && m.total >= 72 ? "easy" : !m.gated && m.total >= 52 ? "mid" : "hard";
  else { const bar = (task.minReputation || 0) + (task.minYears || 0) * 10; level = bar <= 20 ? "easy" : bar <= 50 ? "mid" : "hard"; }
  return { level, ...DIFF_MAP[level] };
}

export function fitsSchedule(task, profile) {
  if (!profile) return null;
  if (task.schedule === "async" || task.schedule === "flexible") return true;
  if ((task.timeCommitmentHours || 0) > (profile.hoursPerWeek || 0)) return false;
  return true;
}

// --- Keyword resume parser (instant fallback for the "Parse resume" button) ---
const SKILL_DICT = ["photography", "navigation", "reliability", "writing", "editing", "proofreading", "driving", "empathy", "listening", "spanish", "translation", "palate", "manual-dexterity", "voice", "notary", "data-entry", "labeling", "research", "customer-service"];
const COURSE_DICT = ["spanish", "creative writing", "statistics", "intro to photography", "chemistry"];
const CITIES = ["denver", "boulder", "san francisco", "austin", "new york"];
const tcase = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());

// Returns partial overrides (undefined where nothing was found) so callers can
// merge without clobbering existing profile fields.
export function parseResumeKeywords(text) {
  const t = String(text || "").toLowerCase();
  const skills = SKILL_DICT.filter((s) => t.includes(s)), coursework = COURSE_DICT.filter((c) => t.includes(c));
  const city = CITIES.find((c) => t.includes(c)), h = t.match(/(\d{1,2})\s*(hrs|hours|h)\b/), y = t.match(/(\d{1,2})\s*(years|yrs|yr)\b/);
  return { location: city ? tcase(city) : undefined, remoteOk: t.includes("remote") || undefined, years: y ? +y[1] : undefined, skills, coursework, hoursPerWeek: h ? +h[1] : undefined };
}
