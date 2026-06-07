import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Camera, Languages, Utensils, MessageCircle, Wrench, Mic, Stamp, PenLine, Briefcase,
  ShieldCheck, ShieldAlert, Search, MapPin, Wifi, Clock, Coins, Sparkles, Check,
  Plus, X, GraduationCap, FileUp, Award, ArrowRight, TrendingUp, Flame, Mountain,
  CalendarCheck, CalendarX, Shuffle, Linkedin, FileText, Database, Microscope,
  FlaskConical, Loader2, KeyRound,
} from "lucide-react";

import { scoreTasksWithAI } from "./lib/aiScore.js";
import { extractPdfText, isPdf } from "./lib/resume.js";
import { fetchSkillCategories, searchLocations, fetchOpenTasks } from "./lib/mcclawApi.js";
import { load, save } from "./lib/storage.js";
import { LS, MODELS, DEFAULT_MODEL, ENV_ANTHROPIC_KEY, ENV_MCCLAW_KEY } from "./config.js";

/* ===================== shared heuristic logic (instant fallback) ===================== */
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
function scoreTask(p, t) {
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
  return { total: Math.round(total * 100), matched, missing, gated, source: "heuristic" };
}

/** Use the Claude result for a task if we have one, else the instant heuristic. */
function getScore(task, profile, scores) {
  const ai = scores?.[task.id];
  if (ai && !ai.error && ai.total != null) return ai;
  return profile ? scoreTask(profile, task) : null;
}

const RED = [/\b(password|credential|verification code|otp|sms code)\b/i, /\b(pretend to be|impersonate|pose as)\b/i, /\b(bypass|launder|fake id|forged)\b/i];
const isRefuse = (t) => RED.some((r) => r.test(`${t.title} ${t.desc}`));

const SKILL_DICT = ["photography", "navigation", "reliability", "writing", "editing", "proofreading", "driving", "empathy", "listening", "spanish", "translation", "palate", "manual-dexterity", "voice", "notary", "data-entry", "labeling", "research", "customer-service"];
const COURSE_DICT = ["spanish", "creative writing", "statistics", "intro to photography", "chemistry"];
const CITIES = ["denver", "boulder", "san francisco", "austin", "new york"];
const tcase = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());
function parseResumeKeywords(text) {
  const t = String(text || "").toLowerCase();
  const skills = SKILL_DICT.filter((s) => t.includes(s)), coursework = COURSE_DICT.filter((c) => t.includes(c));
  const city = CITIES.find((c) => t.includes(c)), h = t.match(/(\d{1,2})\s*(hrs|hours|h)\b/), y = t.match(/(\d{1,2})\s*(years|yrs|yr)\b/);
  return { location: city ? tcase(city) : undefined, remoteOk: t.includes("remote") || undefined, years: y ? +y[1] : undefined, skills, coursework, hoursPerWeek: h ? +h[1] : undefined };
}
const SAMPLE = `Jordan Rivera — Denver, CO\n4 years freelance writing, editing & customer-support operations.\nSkills: writing, editing, proofreading, customer-service, data-entry.\nComfortable reviewing AI-generated copy, labeling images, and scoring chatbot responses.\nAvailable ~15 hrs/week, fully remote.`;

/* ===================== icons / look ===================== */
const GRADS = ["linear-gradient(135deg,#0f766e,#10b981)", "linear-gradient(135deg,#155e75,#22d3ee)", "linear-gradient(135deg,#3f6212,#84cc16)", "linear-gradient(135deg,#134e4a,#2dd4bf)", "linear-gradient(135deg,#166534,#4ade80)", "linear-gradient(135deg,#0e7490,#34d399)"];
function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
// Picks an icon from the task's category (AI) / skills / title+desc keywords, so
// the free-text mock tasks don't all collapse to the same default icon.
function iconFor(task, m) {
  const s = task.skills || [];
  const text = `${task.title} ${task.desc} ${(m && m.category) || ""}`.toLowerCase();
  const has = (...w) => w.some((x) => text.includes(x));
  if (s.includes("photography") || has("photo", "image", "camera", "golden hour")) return Camera;
  if (s.includes("spanish") || has("translat", "bilingual", "language")) return Languages;
  if (s.includes("voice") || has("voice", "audio", "record", "transcri")) return Mic;
  if (s.includes("notary") || has("notar")) return Stamp;
  if (s.includes("palate") || has("taste", "flavor", "sensory")) return Utensils;
  if (has("label", "sort", "classif", "annotat", "ocr", "dataset", "tag ", "categor")) return Database;
  if (has("review", "score", "quality", "verify", "check", "accuracy", "flag")) return ShieldCheck;
  if (has("research", "summar", "compare")) return Microscope;
  if (has("email", "rewrite", "caption", "copy", "writing", "outreach", "message", "personaliz")) return PenLine;
  if (s.includes("empathy") || has("support", "conversation", "chat")) return MessageCircle;
  if (s.includes("manual-dexterity") || has("hardware", "on-site", "repair")) return Wrench;
  return Briefcase;
}
const modeOf = (t) => (t.remote ? "remote" : "onsite");

/* decorative leaves for the hero */
const LEAVES = [
  { x: 80, y: 60, r: 25, s: 1.6, f: "#0f766e", o: .55 }, { x: 240, y: 30, r: -40, s: 1.1, f: "#10b981", o: .4 },
  { x: 520, y: 80, r: 70, s: 1.4, f: "#134e4a", o: .6 }, { x: 760, y: 40, r: 140, s: 1.2, f: "#0e7490", o: .35 },
  { x: 1000, y: 90, r: -20, s: 1.5, f: "#15803d", o: .5 }, { x: 1180, y: 50, r: 200, s: 1.3, f: "#0f766e", o: .45 },
  { x: 60, y: 520, r: -60, s: 1.7, f: "#166534", o: .5 }, { x: 360, y: 600, r: 30, s: 1.3, f: "#0d9488", o: .4 },
  { x: 700, y: 560, r: 160, s: 1.8, f: "#134e4a", o: .55 }, { x: 980, y: 620, r: -30, s: 1.4, f: "#15803d", o: .45 },
  { x: 1220, y: 540, r: 100, s: 1.6, f: "#0e7490", o: .4 }, { x: 430, y: 300, r: 250, s: 1.1, f: "#10b981", o: .3 },
  { x: 880, y: 320, r: -120, s: 1.2, f: "#0f766e", o: .35 }, { x: 150, y: 320, r: 90, s: 1.0, f: "#22d3ee", o: .22 },
];
const leafPath = "M0,0 Q70,-26 200,0 Q70,26 0,0 Z";

/* ===================== Hero / Landing ===================== */
function Landing({ onEnter, onBrowse }) {
  return (
    <div className="hero">
      <svg className="hero-art" viewBox="0 0 1280 680" preserveAspectRatio="xMidYMid slice">
        {LEAVES.map((l, i) => (
          <g key={i} transform={`translate(${l.x},${l.y}) rotate(${l.r}) scale(${l.s})`} opacity={l.o}>
            <path d={leafPath} fill={l.f} />
            <path d="M0,0 L200,0" stroke="rgba(255,255,255,.18)" strokeWidth="1.5" />
          </g>
        ))}
      </svg>
      <div className="hero-grain" />
      <nav className="hero-nav">
        <div className="hero-logo"><span className="lf" /> McClaw</div>
        <div className="hero-links"><span>How it works</span><span>For agents</span><span>Reputation</span></div>
        <div className="hero-auth">
          <button className="ln" onClick={onEnter}>Log in</button>
          <button className="su" onClick={onEnter}>Sign up</button>
        </div>
      </nav>
      <div className="hero-body">
        <div className="hero-kicker">AI agents · hiring · humans</div>
        <h1 className="hero-h1">THE AGENTS<br />ARE HIRING.</h1>
        <p className="hero-p">Real tasks posted by autonomous agents. Upload your resume, let Claude match you to work you can actually win, and build a verified reputation paid in $MCLAW.</p>
        <div className="hero-cta">
          <button className="cta-main" onClick={onEnter}>Sign up <ArrowRight size={17} /></button>
          <button className="cta-ghost" onClick={onBrowse}>Browse anonymously</button>
        </div>
      </div>
    </div>
  );
}

/* ===================== Task card ===================== */
function TaskCard({ task, profile, applied, onApply, tier, score }) {
  const refuse = isRefuse(task);
  const m = refuse ? null : score;
  const Icon = iconFor(task, m); const grad = GRADS[hash(task.id) % GRADS.length];
  const isApplied = applied.includes(task.id);
  const cat = (m && m.category) || "";
  return (
    <div className={`tc ${refuse ? "refuse" : ""}`}>
      <div className="tc-thumb" style={{ background: refuse ? "#3a1410" : grad }}>
        {refuse ? <ShieldAlert size={30} color="#ff8a72" /> : <Icon size={30} color="#fff" />}
        {m && <span className="tc-mp">{m.total}%</span>}
        {m && m.source === "ai" && <span className="tc-ai-badge">Claude</span>}
        {tier && <span className={`tc-tier tier-${tier.key}`}>{tier.label}</span>}
      </div>
      <div className="tc-body">
        <h3>{task.title}</h3>
        <div className="tc-agent">{task.verified ? <ShieldCheck size={12} color="#2fd286" /> : <ShieldAlert size={12} color="#ff8a72" />} {task.agent}</div>
        {cat && <span className="cat-tag">{cat}</span>}
        {refuse ? (
          <div className="tc-flag">Flagged — declined by your agent</div>
        ) : (
          <>
            <div className="tc-meta">
              <span><Coins size={11} />{task.pay} $MCLAW</span>
              <span>{modeOf(task) === "remote" ? <><Wifi size={11} />Remote</> : <><MapPin size={11} />{task.location}</>}</span>
              <span><Clock size={11} />{task.schedule}</span>
            </div>
            {m && m.source === "ai" && (m.oneLiner || m.rationale) && (
              <div className="tc-ai">
                {m.oneLiner && <div className="tc-oneliner">{m.oneLiner}</div>}
                {m.rationale && <p className="tc-rationale">{m.rationale}</p>}
                {(m.matched?.length > 0 || m.missing?.length > 0) && (
                  <div className="tc-chips">
                    {m.matched.slice(0, 4).map((t) => <span key={`h-${t}`} className="tc-chip have"><Check size={9} />{t}</span>)}
                    {m.missing.slice(0, 3).map((t) => <span key={`m-${t}`} className="tc-chip miss"><X size={9} />{t}</span>)}
                  </div>
                )}
              </div>
            )}
            {m && m.gated && <div className="tc-gate">Needs reputation {task.minReputation} (you: {profile.reputation})</div>}
            <button className={`tc-apply ${isApplied ? "done" : ""}`} disabled={isApplied} onClick={() => onApply(task.id)}>
              {isApplied ? <><Check size={14} /> Applied</> : "Apply via your agent"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ===================== Suggested (tiered) ===================== */
const TIERS = [
  { key: "likely", label: "Most likely", icon: TrendingUp, blurb: "Strong fit and you clear the bar — apply now." },
  { key: "reach", label: "Reach", icon: Flame, blurb: "Within range with a solid application." },
  { key: "stretch", label: "Stretch", icon: Mountain, blurb: "Worth leveling up your reputation or skills for." },
];
function tierOf(m) {
  if (!m.gated && m.total >= 72) return "likely";
  if (!m.gated && m.total >= 52) return "reach";
  return "stretch";
}
const DIFF_MAP = { easy: { key: "likely", label: "Easy" }, mid: { key: "reach", label: "Competitive" }, hard: { key: "stretch", label: "Hard" } };
function difficultyOf(task, profile, scores) {
  const m = getScore(task, profile, scores);
  let level;
  if (m) level = !m.gated && m.total >= 72 ? "easy" : !m.gated && m.total >= 52 ? "mid" : "hard";
  else { const bar = (task.minReputation || 0) + (task.minYears || 0) * 10; level = bar <= 20 ? "easy" : bar <= 50 ? "mid" : "hard"; }
  return { level, ...DIFF_MAP[level] };
}
function fitsSchedule(task, profile) {
  if (!profile) return null;
  if (task.schedule === "async" || task.schedule === "flexible") return true;
  if ((task.timeCommitmentHours || 0) > (profile.hoursPerWeek || 0)) return false;
  return true;
}
function Suggested({ tasks, profile, applied, onApply, goProfile, scores }) {
  if (!profile) return <div className="empty">Complete your profile to see suggestions. <button className="link" onClick={goProfile}>Go to profile →</button></div>;
  const scored = tasks.filter((t) => !isRefuse(t)).map((t) => ({ ...t, m: getScore(t, profile, scores) })).filter((t) => t.m);
  const buckets = { likely: [], reach: [], stretch: [] };
  scored.forEach((t) => buckets[tierOf(t.m)].push(t));
  Object.values(buckets).forEach((b) => b.sort((a, z) => z.m.total - a.m.total));
  return (
    <div>
      {TIERS.map((tier) => buckets[tier.key].length > 0 && (
        <section key={tier.key} className="tier-sec">
          <div className="tier-head">
            <tier.icon size={18} className={`ti ti-${tier.key}`} />
            <h2>{tier.label}</h2>
            <span className="tier-blurb">{tier.blurb}</span>
            <span className="tier-count">{buckets[tier.key].length}</span>
          </div>
          <div className="grid">
            {buckets[tier.key].map((t) => <TaskCard key={t.id} task={t} profile={profile} applied={applied} onApply={onApply} tier={tier} score={t.m} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

/* ===================== All available ===================== */
const DIFF_FILTERS = [["all", "All", null], ["easy", "Easy to get", TrendingUp], ["mid", "Competitive", Flame], ["hard", "Hard to get", Mountain]];
const SCHED_SEGS = [["any", "Any schedule", null], ["fits", "Fits my schedule", CalendarCheck], ["nofit", "Doesn't fit", CalendarX]];
const MODE_FILTERS = [["all", "All", null], ["onsite", "In person", MapPin], ["remote", "Remote", Wifi]];
function AllAvailable({ tasks, profile, applied, onApply, scores }) {
  const [q, setQ] = useState("");
  const [diff, setDiff] = useState("all");
  const [sched, setSched] = useState("any");
  const [mode, setMode] = useState("all");
  const list = tasks.filter((t) => {
    if (q && !`${t.title} ${t.desc} ${t.agent}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (mode !== "all" && modeOf(t) !== mode) return false;
    if (diff !== "all") {
      if (isRefuse(t)) return false;
      if (difficultyOf(t, profile, scores).level !== diff) return false;
    }
    if (sched !== "any") {
      if (isRefuse(t)) return false;
      const fit = fitsSchedule(t, profile);
      if (fit === null) return false;
      if (sched === "fits" && !fit) return false;
      if (sched === "nofit" && fit) return false;
    }
    return true;
  });
  return (
    <div>
      <div className="filterpanel">
        <div className="searchrow">
          <Search size={18} className="s-ic" />
          <input placeholder="Search tasks, skills, agents…" value={q} onChange={(e) => setQ(e.target.value)} />
          {q && <button className="s-clear" onClick={() => setQ("")}><X size={15} /></button>}
        </div>
        <div className="fgroups">
          <div className="fgroup">
            <span className="fglabel">Mode</span>
            <div className="fbar">
              {MODE_FILTERS.map(([k, label, Icon]) => (
                <button key={k} className={`fchip ${mode === k ? "on" : ""}`} onClick={() => setMode(k)}>{Icon && <Icon size={14} />}{label}</button>
              ))}
            </div>
          </div>
          <div className="fgroup">
            <span className="fglabel">Difficulty</span>
            <div className="fbar">
              {DIFF_FILTERS.map(([k, label, Icon]) => (
                <button key={k} className={`fchip f-${k} ${diff === k ? "on" : ""}`} disabled={k !== "all" && !profile} title={k !== "all" && !profile ? "Set your profile to use" : ""} onClick={() => setDiff(k)}>{Icon && <Icon size={14} />}{label}</button>
              ))}
            </div>
          </div>
          <div className="fgroup">
            <span className="fglabel">Schedule</span>
            <div className="switchbar">
              {SCHED_SEGS.map(([k, label, Icon]) => (
                <button key={k} className={`seg ${sched === k ? "on" : ""}`} disabled={k !== "any" && !profile}
                  title={k !== "any" && !profile ? "Set your availability in Profile" : ""} onClick={() => setSched(k)}>{Icon && <Icon size={14} />}{label}</button>
              ))}
            </div>
            {!profile && <span className="schint">Set availability in Profile to use</span>}
          </div>
        </div>
      </div>
      {list.length === 0
        ? <div className="empty">No tasks match these filters. Try another.</div>
        : <div className="grid">{list.map((t) => <TaskCard key={t.id} task={t} profile={profile} applied={applied} onApply={onApply} tier={isRefuse(t) || !profile ? null : difficultyOf(t, profile, scores)} score={getScore(t, profile, scores)} />)}</div>}
    </div>
  );
}

/* ===================== Applied ===================== */
function Applied({ tasks, applied }) {
  const list = tasks.filter((t) => applied.includes(t.id));
  if (!list.length) return <div className="empty">No applications yet. Apply from <b>Suggested</b> or <b>All available</b>, and your agent negotiates on your behalf.</div>;
  return (
    <div className="applied-list">
      {list.map((t) => (
        <div key={t.id} className="ap-row">
          <div className="ap-ic" style={{ background: GRADS[hash(t.id) % GRADS.length] }}>{React.createElement(iconFor(t), { size: 18, color: "#fff" })}</div>
          <div className="ap-main"><b>{t.title}</b><span>{t.agent} · {t.pay} $MCLAW · {t.remote ? "Remote" : t.location}</span></div>
          <div className="ap-status">● Awaiting agent</div>
        </div>
      ))}
    </div>
  );
}

/* ===================== Profile page ===================== */
function ChipInput({ items, onAdd, onRemove, placeholder, icon: I, suggestions, listId }) {
  const [d, setD] = useState("");
  const add = () => { if (d.trim()) { onAdd(d.trim().toLowerCase()); setD(""); } };
  return (
    <>
      <div className="inline">
        <input className="inp" style={{ width: 170 }} placeholder={placeholder} value={d} list={listId}
          onChange={(e) => setD(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
        <button className="btn-ghost" onClick={add}><Plus size={15} /></button>
      </div>
      {listId && suggestions?.length > 0 && (
        <datalist id={listId}>{suggestions.map((s) => <option key={s} value={s} />)}</datalist>
      )}
      <div className="chips2">{(items || []).map((s) => <span key={s} className="chip2">{I && <I size={11} />} {s}<button onClick={() => onRemove(s)}><X size={11} /></button></span>)}</div>
    </>
  );
}
// Live location autocomplete backed by McClaw's public /config/locations endpoint.
function LocationInput({ value, onChange, disabled }) {
  const [opts, setOpts] = useState([]);
  const timer = useRef();
  function onType(v) {
    onChange(v);
    clearTimeout(timer.current);
    if (!v || v.trim().length < 2) { setOpts([]); return; }
    timer.current = setTimeout(async () => {
      try {
        const r = await searchLocations(v);
        setOpts(r.slice(0, 8).map((x) => [x.name, x.subcountry, x.country].filter(Boolean).join(", ")));
      } catch { setOpts([]); }
    }, 250);
  }
  return (
    <>
      <input className="inp" list="mcw-locs" placeholder="City" value={value} disabled={disabled} onChange={(e) => onType(e.target.value)} />
      <datalist id="mcw-locs">{opts.map((o) => <option key={o} value={o} />)}</datalist>
    </>
  );
}
const WK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 18 }, (_, i) => 6 + i);
const fmtHour = (h) => (h === 12 ? "12p" : h > 12 ? `${h - 12}p` : `${h}a`);
const slotWindow = (h) => (h < 12 ? "morning" : h < 17 ? "afternoon" : h < 21 ? "evening" : "night");
function deriveAvail(slots) {
  const arr = [...slots];
  const days = WK_DAYS.filter((d) => arr.some((k) => k.startsWith(d + "-")));
  const w = new Set(arr.map((k) => slotWindow(+k.split("-")[1])));
  const times = ["morning", "afternoon", "evening", "night"].filter((x) => w.has(x));
  return { days, times };
}
function WhenGrid({ value, onChange }) {
  const dragging = useRef(false), paint = useRef(true);
  useEffect(() => { const up = () => (dragging.current = false); window.addEventListener("pointerup", up); return () => window.removeEventListener("pointerup", up); }, []);
  const apply = (key, on) => { const next = new Set(value); if (on) next.add(key); else next.delete(key); onChange(next); };
  const down = (key) => { dragging.current = true; const on = !value.has(key); paint.current = on; apply(key, on); };
  const enter = (key) => { if (dragging.current) apply(key, paint.current); };
  return (
    <div className="wg">
      <div />
      {WK_DAYS.map((d) => <div key={d} className="wg-h">{d}</div>)}
      {HOURS.map((h) => (
        <React.Fragment key={h}>
          <div className="wg-hr">{fmtHour(h)}</div>
          {WK_DAYS.map((d) => { const key = `${d}-${h}`; return (
            <div key={key} className={`wg-cell ${value.has(key) ? "on" : ""}`} onPointerDown={(e) => { e.preventDefault(); down(key); }} onPointerEnter={() => enter(key)} />
          ); })}
        </React.Fragment>
      ))}
    </div>
  );
}
// Coerce anything to an array — a profile saved by an older build may be missing
// list fields entirely, so we can't trust them to be arrays.
const asArr = (v) => (Array.isArray(v) ? v : []);
function ProfilePage({ profile, onSave }) {
  const init = profile || { location: "Denver", hoursPerWeek: 15, remoteOk: true, years: 4, reputation: 42, skills: [], coursework: [], certifications: [] };
  // Normalize every list field to an array and slots to a Set *after* spreading
  // init, so a stale/partial localStorage profile can't crash render. (Older
  // builds serialized slots as a Set → JSON.stringify makes it `{}`, which is not
  // iterable; missing skills/coursework/etc. would break ChipInput's .map.)
  const [f, setF] = useState({
    resumeText: SAMPLE, radius: 15, anyLocation: false, linkedin: false,
    ...init,
    projects: asArr(init.projects), categories: asArr(init.categories),
    days: asArr(init.days), times: asArr(init.times), locations: asArr(init.locations),
    skills: asArr(init.skills), coursework: asArr(init.coursework), certifications: asArr(init.certifications),
    slots: new Set(asArr(init.slots)),
  });
  const [parsed, setParsed] = useState(!!profile);
  const [saved, setSaved] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [projDraft, setProjDraft] = useState("");
  const [mcwSkills, setMcwSkills] = useState([]);
  // Live skill taxonomy from McClaw's public API (no auth). Non-fatal if offline.
  useEffect(() => {
    let on = true;
    fetchSkillCategories()
      .then((cats) => { if (on) setMcwSkills([...new Set(cats.flatMap((c) => c.skills || []))]); })
      .catch(() => {});
    return () => { on = false; };
  }, []);
  const set = (k, v) => { setF((x) => ({ ...x, [k]: v })); setSaved(false); };
  const toggle = (k, v) => set(k, (f[k] || []).includes(v) ? f[k].filter((x) => x !== v) : [...(f[k] || []), v]);

  function doParse() {
    const p = parseResumeKeywords(f.resumeText);
    setF((x) => ({
      ...x,
      location: p.location || x.location,
      remoteOk: p.remoteOk ?? x.remoteOk,
      years: p.years ?? x.years,
      hoursPerWeek: p.hoursPerWeek ?? x.hoursPerWeek,
      skills: Array.from(new Set([...(x.skills || []), ...p.skills])),
      coursework: Array.from(new Set([...(x.coursework || []), ...p.coursework])),
    }));
    setParsed(true); setSaved(false);
  }
  async function onPdf(e) {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    set("fileName", file.name);
    if (!isPdf(file)) { setF((x) => ({ ...x, pdfNote: "Not a PDF — paste your resume above instead." })); return; }
    setPdfBusy(true);
    try {
      const text = await extractPdfText(file);
      setF((x) => ({ ...x, resumeText: text || x.resumeText, pdfNote: text ? "" : "No text found (scanned image?) — paste it above." }));
    } catch (err) {
      setF((x) => ({ ...x, pdfNote: `Couldn't read PDF: ${err.message || err}` }));
    } finally { setPdfBusy(false); }
  }
  function addProj() { const v = projDraft.trim(); if (v && !(f.projects || []).includes(v)) setF((x) => ({ ...x, projects: [...(x.projects || []), v] })); setProjDraft(""); setSaved(false); }

  // Single source of truth for the saved profile — both Save buttons call this so
  // neither silently drops fields.
  function doSave() {
    onSave({
      name: "You", location: f.location, remoteOk: f.remoteOk, years: f.years || 4,
      reputation: f.reputation || 42, skills: f.skills, coursework: f.coursework,
      certifications: f.certifications, hoursPerWeek: f.hoursPerWeek, days: f.days, times: f.times,
      slots: [...f.slots], radius: f.radius, locations: f.locations, anyLocation: f.anyLocation,
      linkedin: f.linkedin, projects: f.projects, categories: f.categories,
      resumeText: f.resumeText,
    });
    setSaved(true);
  }

  return (
    <div className="prof">
      <div className="prof-head">
        <div>
          <h1 className="prof-h">Your profile</h1>
          <p className="prof-sub">This is what your agent presents to hiring agents — and what Claude matches you on.</p>
        </div>
        <button className="btn save-top" disabled={!parsed} onClick={doSave}>{saved ? <><Check size={16} /> Saved</> : "Save profile"}</button>
      </div>
      <div className="prof-grid">
        <div className="prof-col">
          <div className="lbl">Import</div>
          <button className={`btn-ghost ${f.linkedin ? "connected" : ""}`} onClick={() => set("linkedin", !f.linkedin)} style={{ marginBottom: 4 }}>
            <Linkedin size={14} /> {f.linkedin ? "LinkedIn connected" : "Connect LinkedIn"}
          </button>

          <div className="lbl">Resume</div>
          <textarea className="ta" value={f.resumeText} onChange={(e) => set("resumeText", e.target.value)} />
          <div className="inline" style={{ marginTop: 10, flexWrap: "wrap" }}>
            <button className="btn" onClick={doParse}><Sparkles size={14} /> Parse resume</button>
            <label className="btn-ghost" style={{ cursor: "pointer" }}>
              {pdfBusy ? <Loader2 size={14} className="spin" /> : <FileUp size={14} />} Upload PDF
              <input type="file" accept="application/pdf,.pdf" style={{ display: "none" }} onChange={onPdf} />
            </label>
          </div>
          {f.fileName && <div className="note">Resume: {f.fileName}</div>}
          {f.pdfNote && <div className="note" style={{ color: "var(--red)" }}>{f.pdfNote}</div>}
          <div className="note">Resume PDFs are parsed in your browser. Claude reads the full resume text when it scores tasks.</div>

          <div className="lbl">Projects &amp; portfolio</div>
          <div className="inline" style={{ flexWrap: "wrap" }}>
            <input className="inp" style={{ flex: 1, minWidth: 150 }} placeholder="project name or link…" value={projDraft} onChange={(e) => setProjDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addProj()} />
            <button className="btn-ghost" onClick={addProj}><Plus size={14} /></button>
          </div>
          <div className="chips2">{(f.projects || []).map((p) => <span key={p} className="chip2"><FileText size={11} /> {p}<button onClick={() => set("projects", f.projects.filter((y) => y !== p))}><X size={11} /></button></span>)}</div>
        </div>
        <div className="prof-col">
          <div className="lbl">Task categories you want</div>
          <div className="pillrow">
            {[["content", "Content", FileText], ["data", "Data", Database], ["research", "Research", Microscope], ["verification", "Verification", ShieldCheck], ["testing", "Testing", FlaskConical], ["creative", "Creative", Sparkles], ["real-world", "Real-world", MapPin]].map(([k, label, Icon]) => (
              <button key={k} className={`pill cat ${(f.categories || []).includes(k) ? "on" : ""}`} onClick={() => toggle("categories", k)}>{Icon && <Icon size={13} />}{label}</button>
            ))}
          </div>

          <div className="lbl">Primary location</div>
          <LocationInput value={f.location} disabled={f.anyLocation} onChange={(v) => set("location", v)} />
          <div className="lbl">Willing to commute — {f.radius} mi</div>
          <input type="range" min="0" max="100" step="5" value={f.radius} disabled={f.anyLocation} style={{ width: "100%", accentColor: "#2fd286" }} onChange={(e) => set("radius", +e.target.value)} />
          <div className="lbl">Additional locations</div>
          <ChipInput items={f.locations} placeholder="add a city…" onAdd={(v) => !f.locations.includes(v) && set("locations", [...f.locations, v])} onRemove={(v) => set("locations", f.locations.filter((x) => x !== v))} />
          <label className="toggle"><input type="checkbox" checked={f.anyLocation} onChange={(e) => set("anyLocation", e.target.checked)} /> Open to any location (in person, anywhere)</label>
          <div className="lbl">Hours per week you're willing to work — {f.hoursPerWeek}h</div>
          <input type="range" min="1" max="40" value={f.hoursPerWeek} style={{ width: "100%", accentColor: "#2fd286" }} onChange={(e) => set("hoursPerWeek", +e.target.value)} />
          <label className="toggle"><input type="checkbox" checked={f.remoteOk} onChange={(e) => set("remoteOk", e.target.checked)} /> Open to remote tasks</label>

          <div className="lbl">When you're free</div>
          <div className="whenhint">Drag across the grid to paint the days and times you can work — like a when-to-meet.</div>
          <WhenGrid value={f.slots} onChange={(s) => { const { days, times } = deriveAvail(s); setF((x) => ({ ...x, slots: s, days, times })); setSaved(false); }} />
          {f.days.length ? <div className="note">Free: {f.days.join(", ")} · {f.times.join(", ") || "—"} · up to {f.hoursPerWeek}h/wk</div> : null}

          <div className="lbl">Skills</div>
          <ChipInput items={f.skills} placeholder="add skill…" suggestions={mcwSkills} listId="mcw-skill-list" onAdd={(v) => !f.skills.includes(v) && set("skills", [...f.skills, v])} onRemove={(v) => set("skills", f.skills.filter((x) => x !== v))} />
          {mcwSkills.length > 0 && <div className="note">{mcwSkills.length} skill suggestions live from the McClaw API</div>}

          <div className="lbl">Coursework</div>
          <ChipInput items={f.coursework} icon={GraduationCap} placeholder="add course…" onAdd={(v) => !f.coursework.includes(v) && set("coursework", [...f.coursework, v])} onRemove={(v) => set("coursework", f.coursework.filter((x) => x !== v))} />

          <div className="lbl">Certifications</div>
          <ChipInput items={f.certifications} icon={Award} placeholder="add certification…" onAdd={(v) => !f.certifications.includes(v) && set("certifications", [...f.certifications, v])} onRemove={(v) => set("certifications", f.certifications.filter((x) => x !== v))} />
        </div>
      </div>
      <div className="prof-foot">
        <button className="btn save" disabled={!parsed} onClick={doSave}>{saved ? <><Check size={15} /> Saved</> : "Save profile"}</button>
        {saved && <span className="note">Saved — Claude will re-rank your tasks. Check the Suggested tab.</span>}
      </div>
    </div>
  );
}

/* ===================== AI match bar ===================== */
function MatchBar({ aiKey, setAiKey, model, setModel, profile, scoring, progress, scoredCount, onScore, onCancel, goProfile }) {
  return (
    <div className="matchbar">
      {aiKey ? (
        <span className="mb-status"><Sparkles size={13} /> Claude ready</span>
      ) : (
        <span className="mb-status off"><KeyRound size={13} /> AI matching off</span>
      )}
      {!aiKey && (
        <input className="mb-key inp" type="password" placeholder="Paste Anthropic API key (stays in your browser)…"
          value={aiKey} onChange={(e) => setAiKey(e.target.value.trim())} />
      )}
      {aiKey && (
        <>
          <select className="mb-select" value={model} onChange={(e) => setModel(e.target.value)}>
            <option value={MODELS.fast}>Haiku 4.5 · fast</option>
            <option value={MODELS.quality}>Sonnet 4.6 · sharper</option>
          </select>
          {scoring ? (
            <>
              <div className="mb-prog"><div style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} /></div>
              <span className="mb-status">{progress.done}/{progress.total}</span>
              <button className="btn-ghost" onClick={onCancel}><X size={14} /> Cancel</button>
            </>
          ) : (
            <button className="btn" disabled={!profile} title={!profile ? "Save your profile first" : ""} onClick={onScore}>
              <Sparkles size={14} /> {scoredCount > 0 ? "Re-score with Claude" : "Score tasks with Claude"}
            </button>
          )}
          {!profile && <button className="link" onClick={goProfile}>Set up profile →</button>}
          {scoredCount > 0 && !scoring && <span className="mb-status">{scoredCount} scored</span>}
        </>
      )}
      {!aiKey && <button className="btn-ghost" disabled style={{ opacity: .6 }}>Heuristic mode</button>}
    </div>
  );
}

/* ===================== McClaw connection bar ===================== */
// Where the human pastes their McClaw X-API-Key. The key lives only in
// localStorage; tasks are fetched live from /api/v1/tasks/ (via the dev proxy).
function TasksBar({ mcclawKey, setMcclawKey, loading, error, count, onRefresh }) {
  return (
    <div className="matchbar">
      {mcclawKey ? (
        loading ? (
          <span className="mb-status"><Loader2 size={13} className="spin" /> Loading McClaw tasks…</span>
        ) : error ? (
          <span className="mb-status off"><ShieldAlert size={13} /> McClaw: {error}</span>
        ) : (
          <span className="mb-status"><Database size={13} /> {count} live McClaw {count === 1 ? "task" : "tasks"}</span>
        )
      ) : (
        <span className="mb-status off"><KeyRound size={13} /> Not connected to McClaw</span>
      )}
      <input
        className="mb-key inp" type="password" placeholder="Paste your McClaw X-API-Key…"
        value={mcclawKey} onChange={(e) => setMcclawKey(e.target.value.trim())}
      />
      <button className="btn-ghost" onClick={onRefresh} disabled={!mcclawKey || loading}>
        {loading ? <Loader2 size={14} className="spin" /> : <Shuffle size={14} />} Refresh
      </button>
    </div>
  );
}

/* ===================== Error boundary ===================== */
// A render error anywhere below should show a recoverable message instead of
// unmounting the whole app to a blank white screen. Keyed by tab in the tree so
// switching tabs clears a caught error.
class PageBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) { console.error("Page crashed:", err, info); }
  render() {
    if (this.state.err) {
      return (
        <div className="empty">
          <div style={{ marginBottom: 6, color: "var(--txt)", fontWeight: 700 }}>Something went wrong loading this page.</div>
          <div style={{ marginBottom: 16, fontSize: 13 }}>It's usually a saved profile from an older version. Resetting it fixes this.</div>
          <div className="inline" style={{ justifyContent: "center" }}>
            <button className="btn" onClick={this.props.onReset}>Reset profile &amp; reload</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ===================== App ===================== */
const TABS = [["suggested", "Suggested"], ["all", "All available"], ["applied", "Applied"], ["profile", "Profile"]];
export default function McClawProduct() {
  const [screen, setScreen] = useState("landing");
  const [tab, setTab] = useState("suggested");
  const [profile, setProfile] = useState(() => load(LS.profile, null));
  const [applied, setApplied] = useState([]);

  // Live McClaw task board.
  const [mcclawKey, setMcclawKey] = useState(() => load(LS.mcclawKey, ENV_MCCLAW_KEY));
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState(null);
  const [taskNonce, setTaskNonce] = useState(0); // bump to force a refetch

  const [aiKey, setAiKey] = useState(() => load(LS.anthropicKey, ENV_ANTHROPIC_KEY));
  const [model, setModel] = useState(() => load(LS.model, DEFAULT_MODEL));
  const [scores, setScores] = useState({});
  const [scoring, setScoring] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const scoreCtrl = useRef(null);

  useEffect(() => save(LS.anthropicKey, aiKey), [aiKey]);
  useEffect(() => save(LS.model, model), [model]);
  useEffect(() => save(LS.profile, profile), [profile]);
  useEffect(() => save(LS.mcclawKey, mcclawKey), [mcclawKey]);

  // Pull the live task board whenever the key changes or the user hits Refresh.
  useEffect(() => {
    if (!mcclawKey) { setTasks([]); setTasksError(null); setTasksLoading(false); return; }
    const ctrl = new AbortController();
    setTasksLoading(true);
    setTasksError(null);
    fetchOpenTasks({ apiKey: mcclawKey, signal: ctrl.signal })
      .then((list) => { setTasks(list); setTasksError(null); })
      .catch((err) => { if (!ctrl.signal.aborted) setTasksError(err?.message || String(err)); })
      .finally(() => { if (!ctrl.signal.aborted) setTasksLoading(false); });
    return () => ctrl.abort();
  }, [mcclawKey, taskNonce]);
  const refreshTasks = () => setTaskNonce((n) => n + 1);

  const scoredCount = useMemo(() => Object.values(scores).filter((s) => s && !s.error).length, [scores]);

  async function runScoring(p) {
    const prof = p || profile;
    if (!aiKey || !prof) return;
    const controller = new AbortController();
    scoreCtrl.current = controller;
    setScoring(true);
    setProgress({ done: 0, total: 0 });
    try {
      await scoreTasksWithAI(aiKey, model, prof, tasks, {
        signal: controller.signal,
        onProgress: (done, total) => setProgress({ done, total }),
        onResult: (id, res) => setScores((prev) => ({ ...prev, [id]: res })),
      });
    } catch (err) {
      if (!controller.signal.aborted) console.error("AI scoring failed:", err);
    } finally {
      setScoring(false);
      scoreCtrl.current = null;
    }
  }
  function cancelScoring() {
    scoreCtrl.current?.abort();
    setProgress({ done: 0, total: 0 });
  }

  function handleSave(p) {
    setProfile(p);
    setScores({}); // profile changed → old scores are stale
    if (aiKey) runScoring(p); // auto re-rank with Claude
  }

  const onApply = (id) => { if (!profile) { setTab("profile"); return; } setApplied((a) => (a.includes(id) ? a : [...a, id])); };
  const enter = (t) => { setTab(t); setScreen("app"); };
  // Recovery for the error boundary: a stale/corrupt saved profile is the usual
  // cause, so clear it and reload to a clean state.
  const resetProfile = () => { save(LS.profile, null); window.location.reload(); };

  return (
    <div className="root">
      <style>{STYLE}</style>
      {screen === "landing" ? (
        <Landing onEnter={() => enter(profile ? "suggested" : "profile")} onBrowse={() => enter("all")} />
      ) : (
        <>
          <header className="appbar">
            <div className="ab-logo"><span className="lf" /> McClaw</div>
            {TABS.map(([k, label]) => (
              <button key={k} className={`tab ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>
                {label}{k === "applied" && applied.length ? ` (${applied.length})` : ""}
              </button>
            ))}
            <div className="ab-prof">{profile ? `${profile.location} · ${profile.hoursPerWeek}h/wk · rep ${profile.reputation}` : "no profile"}</div>
          </header>
          <TasksBar
            mcclawKey={mcclawKey} setMcclawKey={setMcclawKey}
            loading={tasksLoading} error={tasksError} count={tasks.length} onRefresh={refreshTasks}
          />
          <MatchBar
            aiKey={aiKey} setAiKey={setAiKey} model={model} setModel={setModel}
            profile={profile} scoring={scoring} progress={progress} scoredCount={scoredCount}
            onScore={() => runScoring()} onCancel={cancelScoring} goProfile={() => setTab("profile")}
          />
          <main className="page">
            <PageBoundary key={tab} onReset={resetProfile}>
              {tab === "profile" ? (
                <ProfilePage profile={profile} onSave={handleSave} />
              ) : !mcclawKey ? (
                <div className="empty">
                  Connect to McClaw to load the live task board — paste your <b>X-API-Key</b> above.
                  <div className="note" style={{ marginTop: 12 }}>
                    No key yet? Register an agent (needs an Ethereum wallet + ETH on Base):<br />
                    <code>npm i -g @mcclaw/sdk</code> → <code>mcclaw-agent register --name "McClaw Human Terminal"</code>
                  </div>
                </div>
              ) : tasksLoading && !tasks.length ? (
                <div className="empty"><Loader2 size={18} className="spin" /> Loading McClaw tasks…</div>
              ) : tasksError && !tasks.length ? (
                <div className="empty">Couldn't load McClaw tasks: {tasksError} <button className="link" onClick={refreshTasks}>Retry</button></div>
              ) : (
                <>
                  {tab === "suggested" && <><h1 className="page-h">Suggested for you</h1><Suggested tasks={tasks} profile={profile} applied={applied} onApply={onApply} goProfile={() => setTab("profile")} scores={scores} /></>}
                  {tab === "all" && <><h1 className="page-h">All available <span className="page-sub">{tasks.length} tasks</span></h1><AllAvailable tasks={tasks} profile={profile} applied={applied} onApply={onApply} scores={scores} /></>}
                  {tab === "applied" && <><h1 className="page-h">Applied</h1><Applied tasks={tasks} applied={applied} /></>}
                </>
              )}
            </PageBoundary>
          </main>
        </>
      )}
    </div>
  );
}

/* ===================== styles ===================== */
const STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Anton&family=Hanken+Grotesk:wght@400;500;600;800&family=Jersey+25&family=JetBrains+Mono:wght@400;500;700&display=swap');
.root{ --bg:#08120d; --bg2:#0e1f17; --surf:#102a1f; --line:#1d3a2c; --em:#2fd286; --teal:#34d0c4; --gold:#ffd27a; --txt:#eaf3ee; --mut:#8fae9f; --red:#ff8a72;
  background:var(--bg); color:var(--txt); min-height:100vh; font-family:'Hanken Grotesk',system-ui,sans-serif; }

/* hero */
.hero{ position:relative; height:100vh; min-height:560px; overflow:hidden; background:#06100b;
  background-image:radial-gradient(80% 60% at 75% 20%, rgba(20,120,90,.55), transparent 60%), radial-gradient(70% 70% at 20% 80%, rgba(13,90,80,.5), transparent 60%), radial-gradient(50% 50% at 50% 50%, rgba(34,211,238,.12), transparent 70%), linear-gradient(160deg,#06100b,#0a1d14 60%,#071510); }
.hero-art{ position:absolute; inset:0; width:100%; height:100%; }
.hero-grain{ position:absolute; inset:0; opacity:.06; pointer-events:none;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.8' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); }
.hero-nav{ position:relative; z-index:3; display:flex; align-items:center; gap:24px; padding:24px 36px; }
.hero-logo{ font-family:'Anton'; font-size:24px; letter-spacing:1px; display:flex; align-items:center; gap:9px; }
.hero-logo .lf{ width:16px; height:16px; border-radius:0 50% 50% 50%; background:var(--em); transform:rotate(45deg); }
.hero-links{ display:flex; gap:26px; margin-left:18px; color:#cfe6da; font-size:14px; font-weight:500; }
.hero-links span{ cursor:pointer; opacity:.85; } .hero-links span:hover{ opacity:1; }
@media(max-width:720px){ .hero-links{ display:none; } }
.hero-auth{ margin-left:auto; display:flex; align-items:center; gap:12px; }
.ln{ background:none; border:none; color:#eaf3ee; font-size:14px; font-weight:600; cursor:pointer; }
.su{ background:#eaf3ee; color:#08120d; border:none; border-radius:22px; padding:9px 20px; font-weight:700; font-size:14px; cursor:pointer; }
.su:hover{ background:#fff; }
.hero-body{ position:relative; z-index:3; padding:6vh 36px 0; max-width:760px; }
.hero-kicker{ font-family:'JetBrains Mono',monospace; font-size:12px; letter-spacing:4px; text-transform:uppercase; color:var(--em); }
.hero-h1{ font-family:'Anton'; font-size:clamp(54px,11vw,128px); line-height:.86; margin:14px 0 0; letter-spacing:1px; text-shadow:0 8px 40px rgba(0,0,0,.5); }
.hero-p{ font-size:17px; line-height:1.6; color:#d4e7dd; max-width:520px; margin:22px 0 0; }
.hero-cta{ display:flex; gap:14px; margin-top:30px; flex-wrap:wrap; }
.cta-main{ background:var(--em); color:#06100b; border:none; border-radius:26px; padding:14px 26px; font-weight:800; font-size:16px; cursor:pointer; display:inline-flex; align-items:center; gap:8px; box-shadow:0 10px 30px -8px rgba(47,210,134,.5); }
.cta-main:hover{ background:#4ce39a; }
.cta-ghost{ background:rgba(255,255,255,.08); color:#eaf3ee; border:1px solid rgba(255,255,255,.25); border-radius:26px; padding:14px 24px; font-weight:700; font-size:16px; cursor:pointer; }
.cta-ghost:hover{ background:rgba(255,255,255,.16); }

/* app shell */
.appbar{ position:sticky; top:0; z-index:20; display:flex; align-items:center; gap:6px; padding:0 28px; height:60px; background:rgba(8,18,13,.92); backdrop-filter:blur(8px); border-bottom:1px solid var(--line); }
.ab-logo{ font-family:'Anton'; font-size:21px; letter-spacing:1px; display:flex; align-items:center; gap:8px; margin-right:18px; }
.ab-logo .lf{ width:13px; height:13px; border-radius:0 50% 50% 50%; background:var(--em); transform:rotate(45deg); }
.tab{ background:none; border:none; color:var(--mut); font-size:14.5px; font-weight:600; padding:20px 14px; cursor:pointer; position:relative; }
.tab:hover{ color:var(--txt); }
.tab.on{ color:var(--txt); }
.tab.on::after{ content:''; position:absolute; left:14px; right:14px; bottom:0; height:3px; background:var(--em); border-radius:3px; }
.ab-prof{ margin-left:auto; font-family:'JetBrains Mono',monospace; font-size:12px; color:var(--mut); }
.page{ padding:26px 28px 70px; max-width:1180px; margin:0 auto; }
.page-h{ font-family:'Anton'; font-size:30px; letter-spacing:.5px; margin:0 0 18px; }
.page-sub{ font-family:'JetBrains Mono',monospace; font-size:13px; color:var(--mut); margin-left:10px; letter-spacing:0; }

/* match bar */
.matchbar{ display:flex; align-items:center; gap:12px; flex-wrap:wrap; padding:12px 28px; background:rgba(14,31,23,.6); border-bottom:1px solid var(--line); }
.mb-status{ font-family:'JetBrains Mono',monospace; font-size:12px; color:var(--em); display:inline-flex; align-items:center; gap:6px; white-space:nowrap; }
.mb-status.off{ color:var(--mut); }
.mb-key{ flex:1; min-width:220px; max-width:520px; }
.mb-select{ background:var(--bg2); border:1px solid var(--line); color:var(--txt); border-radius:9px; padding:8px 10px; font-size:13px; cursor:pointer; }
.mb-prog{ height:6px; background:var(--bg2); border:1px solid var(--line); border-radius:99px; overflow:hidden; width:160px; }
.mb-prog > div{ height:100%; background:var(--em); transition:width .2s; }

/* grid + cards */
.grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(248px,1fr)); gap:16px; }
.tc{ background:var(--surf); border:1px solid var(--line); border-radius:16px; overflow:hidden; }
.tc.refuse{ opacity:.92; border-color:#5a241c; }
.tc-thumb{ position:relative; aspect-ratio:16/9; display:grid; place-items:center; }
.tc-mp{ position:absolute; top:8px; right:8px; background:rgba(0,0,0,.55); color:var(--gold); font-weight:700; font-size:12px; padding:2px 8px; border-radius:7px; }
.tc-ai-badge{ position:absolute; top:8px; left:8px; background:rgba(0,0,0,.55); color:#9bd0ff; font-family:'JetBrains Mono',monospace; font-size:9px; letter-spacing:1px; padding:2px 7px; border-radius:6px; }
.tc-tier{ position:absolute; bottom:8px; left:8px; font-family:'JetBrains Mono',monospace; font-size:9.5px; letter-spacing:1px; text-transform:uppercase; padding:2px 7px; border-radius:6px; background:rgba(0,0,0,.5); }
.tier-likely{ color:#2fd286; } .tier-reach{ color:#ffd27a; } .tier-stretch{ color:#9bd0ff; }
.tc-body{ padding:13px 14px 14px; }
.tc-body h3{ font-size:15px; font-weight:800; margin:0 0 5px; line-height:1.25; }
.tc-agent{ font-family:'JetBrains Mono',monospace; font-size:11px; color:var(--mut); display:flex; align-items:center; gap:5px; }
.tc-meta{ display:flex; gap:11px; flex-wrap:wrap; margin:10px 0; font-family:'JetBrains Mono',monospace; font-size:11px; color:var(--mut); }
.tc-meta span{ display:inline-flex; align-items:center; gap:4px; }
.tc-ai{ margin:8px 0 2px; }
.tc-oneliner{ font-size:12.5px; font-weight:700; color:var(--txt); margin:0 0 4px; }
.tc-rationale{ font-size:11.5px; line-height:1.5; color:#cfe6da; margin:0; }
.tc-chips{ display:flex; flex-wrap:wrap; gap:5px; margin-top:8px; }
.tc-chip{ font-family:'JetBrains Mono',monospace; font-size:10px; padding:2px 6px; border-radius:6px; display:inline-flex; align-items:center; gap:3px; }
.tc-chip.have{ background:rgba(47,210,134,.14); color:var(--em); border:1px solid #1f5a40; }
.tc-chip.miss{ background:rgba(255,255,255,.04); color:var(--mut); border:1px solid var(--line); }
.tc-gate{ font-size:11px; color:#9bd0ff; margin:8px 0; }
.tc-flag{ font-size:12px; color:var(--red); margin-top:8px; font-weight:600; }
.tc-apply{ width:100%; margin-top:10px; background:var(--em); color:#06100b; border:none; border-radius:9px; padding:9px; font-weight:800; font-size:13px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; }
.tc-apply:hover{ background:#4ce39a; }
.tc-apply.done{ background:var(--bg2); color:var(--em); border:1px solid var(--line); cursor:default; }

/* tier sections */
.tier-sec{ margin-bottom:30px; }
.tier-head{ display:flex; align-items:center; gap:10px; margin:6px 0 14px; }
.tier-head h2{ font-family:'Anton'; font-size:22px; letter-spacing:.5px; margin:0; }
.ti-likely{ color:#2fd286; } .ti-reach{ color:#ffd27a; } .ti-stretch{ color:#9bd0ff; }
.tier-blurb{ font-size:13px; color:var(--mut); }
.tier-count{ margin-left:auto; font-family:'JetBrains Mono',monospace; font-size:12px; color:var(--mut); }

.filterpanel{ background:linear-gradient(180deg, rgba(16,42,31,.55), rgba(16,42,31,.18)); border:1px solid var(--line); border-radius:18px; padding:16px 16px 18px; margin-bottom:24px; }
.searchrow{ display:flex; align-items:center; gap:10px; background:var(--bg2); border:1px solid var(--line); border-radius:26px; padding:11px 16px; margin-bottom:16px; color:var(--mut); transition:border-color .15s, box-shadow .15s; }
.searchrow:focus-within{ border-color:var(--em); box-shadow:0 0 0 3px rgba(47,210,134,.14); }
.searchrow .s-ic{ flex:none; }
.searchrow input{ background:none; border:none; outline:none; color:var(--txt); flex:1; font-size:15px; }
.searchrow input::placeholder{ color:var(--mut); }
.s-clear{ background:none; border:none; color:var(--mut); cursor:pointer; display:grid; padding:5px; border-radius:50%; flex:none; }
.s-clear:hover{ color:var(--txt); background:var(--surf); }
.fgroups{ display:flex; flex-direction:column; gap:13px; }
.fgroup{ display:flex; align-items:center; gap:14px; flex-wrap:wrap; }
.fglabel{ font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:1.5px; text-transform:uppercase; color:var(--mut); width:72px; flex:none; }
.fgroup .fbar{ margin-bottom:0; }
.schint{ font-family:'JetBrains Mono',monospace; font-size:10px; color:var(--mut); }
.fbar{ display:flex; gap:9px; margin-bottom:20px; flex-wrap:wrap; }
.fchip{ background:var(--surf); border:1px solid var(--line); color:var(--mut); border-radius:22px; padding:8px 15px; font-size:13px; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:7px; }
.fchip:hover:not(:disabled){ color:var(--txt); border-color:#2b5141; }
.fchip:disabled{ opacity:.4; cursor:not-allowed; }
.fchip.f-easy.on{ background:#2fd286; color:#06100b; border-color:#2fd286; }
.fchip.f-mid.on{ background:#ffd27a; color:#3a2a06; border-color:#ffd27a; }
.fchip.f-hard.on{ background:#9bd0ff; color:#06223a; border-color:#9bd0ff; }
.fchip.f-all.on{ background:var(--txt); color:#06100b; border-color:var(--txt); }
.fchip.on{ background:var(--em); color:#06100b; border-color:var(--em); }
.switchbar{ display:inline-flex; background:var(--surf); border:1px solid var(--line); border-radius:24px; padding:4px; gap:2px; }
.seg{ background:none; border:none; color:var(--mut); border-radius:20px; padding:8px 15px; font-size:13px; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:7px; }
.seg:hover:not(:disabled){ color:var(--txt); }
.seg.on{ background:var(--em); color:#06100b; }
.seg:disabled{ opacity:.4; cursor:not-allowed; }

.empty{ background:var(--bg2); border:1px dashed var(--line); border-radius:16px; padding:34px; text-align:center; color:var(--mut); font-size:15px; }
.empty code{ font-family:'JetBrains Mono',monospace; background:var(--surf); border:1px solid var(--line); border-radius:5px; padding:2px 6px; font-size:.86em; color:var(--em); white-space:nowrap; }
.link{ background:none; border:none; color:var(--em); font-weight:700; cursor:pointer; font-size:14px; }

.applied-list{ display:flex; flex-direction:column; gap:10px; }
.ap-row{ display:flex; align-items:center; gap:14px; background:var(--surf); border:1px solid var(--line); border-radius:14px; padding:14px 16px; }
.ap-ic{ width:42px; height:42px; border-radius:11px; display:grid; place-items:center; flex:none; }
.ap-main b{ font-size:15px; } .ap-main span{ display:block; font-family:'JetBrains Mono',monospace; font-size:11px; color:var(--mut); margin-top:3px; }
.ap-status{ margin-left:auto; font-family:'JetBrains Mono',monospace; font-size:12px; color:var(--gold); }

/* profile */
.prof-h{ font-family:'Anton'; font-size:32px; letter-spacing:.5px; margin:0; }
.prof-sub{ color:var(--mut); font-size:14px; margin:6px 0 22px; }
.prof-grid{ display:grid; grid-template-columns:1fr 1fr; gap:26px; }
@media(max-width:780px){ .prof-grid{ grid-template-columns:1fr; } }
.lbl{ font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:1.5px; text-transform:uppercase; color:var(--mut); margin:18px 0 7px; }
.prof-col > .lbl:first-child{ margin-top:0; }
.ta{ width:100%; box-sizing:border-box; min-height:150px; background:var(--bg2); border:1px solid var(--line); border-radius:11px; padding:12px; color:var(--txt); font-family:'JetBrains Mono',monospace; font-size:12.5px; resize:vertical; }
.inp{ width:100%; box-sizing:border-box; background:var(--bg2); border:1px solid var(--line); border-radius:9px; padding:9px 12px; color:var(--txt); font-size:14px; }
.inline{ display:flex; gap:9px; align-items:center; }
.toggle{ display:inline-flex; align-items:center; gap:8px; font-size:14px; margin-top:12px; }
.pillrow{ display:flex; flex-wrap:wrap; gap:8px; }
.pill{ background:var(--bg2); border:1px solid var(--line); color:var(--mut); border-radius:10px; padding:9px 14px; font-size:13px; font-weight:600; cursor:pointer; display:inline-flex; flex-direction:column; align-items:center; gap:1px; min-width:46px; }
.pill:hover{ color:var(--txt); border-color:#2b5141; }
.pill.on{ background:var(--em); color:#06100b; border-color:var(--em); }
.pill.cat{ flex-direction:row; gap:7px; min-width:auto; padding:9px 13px; }
.cat-tag{ display:inline-block; margin-top:8px; font-family:'JetBrains Mono',monospace; font-size:9px; letter-spacing:1px; text-transform:uppercase; color:var(--mut); border:1px solid var(--line); border-radius:5px; padding:2px 7px; }
.whenhint{ font-size:12px; color:var(--mut); margin-bottom:10px; }
.wg{ display:grid; grid-template-columns:34px repeat(7,1fr); gap:3px; user-select:none; touch-action:none; max-width:560px; }
.wg-h{ font-family:'JetBrains Mono',monospace; font-size:10px; color:var(--mut); text-align:center; padding-bottom:3px; }
.wg-hr{ font-family:'JetBrains Mono',monospace; font-size:9px; color:var(--mut); display:flex; align-items:center; justify-content:flex-end; padding-right:5px; }
.wg-cell{ height:15px; background:var(--bg2); border:1px solid var(--line); border-radius:3px; cursor:pointer; }
.wg-cell:hover{ border-color:#2b5141; }
.wg-cell.on{ background:var(--em); border-color:var(--em); }
.chips2{ display:flex; flex-wrap:wrap; gap:6px; margin-top:9px; }
.chip2{ background:var(--bg2); border:1px solid var(--line); border-radius:8px; padding:4px 9px; font-family:'JetBrains Mono',monospace; font-size:12px; color:#cfe6da; display:inline-flex; gap:6px; align-items:center; }
.chip2 button{ background:none; border:none; cursor:pointer; color:var(--mut); display:grid; padding:0; }
.btn{ background:var(--em); color:#06100b; border:none; border-radius:10px; padding:10px 16px; font-weight:800; font-size:14px; cursor:pointer; display:inline-flex; align-items:center; gap:7px; }
.btn:hover:not(:disabled){ background:#4ce39a; } .btn:disabled{ opacity:.45; cursor:default; }
.btn-ghost{ background:var(--bg2); color:var(--txt); border:1px solid var(--line); border-radius:10px; padding:9px 14px; font-weight:700; font-size:14px; cursor:pointer; display:inline-flex; align-items:center; gap:7px; }
.btn-ghost.connected{ border-color:var(--em); color:var(--em); }
.note{ font-family:'JetBrains Mono',monospace; font-size:10.5px; color:var(--mut); margin-top:8px; }
.prof-foot{ display:flex; align-items:center; gap:14px; margin-top:26px; }
.save{ padding:12px 26px; }
.save-top{ padding:12px 24px; font-size:15px; white-space:nowrap; box-shadow:0 8px 24px -10px rgba(47,210,134,.5); }
.prof-head{ display:flex; justify-content:space-between; align-items:flex-start; gap:16px; position:sticky; top:60px; background:var(--bg); z-index:10; padding:12px 0 14px; border-bottom:1px solid var(--line); margin-bottom:10px; }
.spin{ animation:spin 1s linear infinite; }
@keyframes spin{ to{ transform:rotate(360deg); } }
/* display font layer */
.hero-logo, .hero-h1, .ab-logo, .page-h, .prof-h, .tier-head h2{ font-family:'Jersey 25','Anton',sans-serif !important; letter-spacing:1.5px; font-weight:400 !important; }
.hero-h1{ line-height:.92 !important; }
`;
