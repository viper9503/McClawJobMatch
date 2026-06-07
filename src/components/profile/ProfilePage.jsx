import React, { useState, useEffect } from "react";
import {
  Check, Sparkles, FileUp, FileText, Plus, X, Linkedin, GraduationCap, Award,
  ArrowRight, Loader2,
} from "lucide-react";
import TypingBox from "./TypingBox.jsx";
import { ChipInput, LocationInput } from "./ChipInput.jsx";
import WhenGrid, { deriveAvail } from "./WhenGrid.jsx";
import CategoryPicker from "./CategoryPicker.jsx";
import { SAMPLE, SAMPLE_TRANSCRIPT } from "../../data/tasks.js";
import { parseResumeKeywords } from "../../lib/heuristic.js";
import { extractPdfText, isPdf } from "../../lib/resume.js";
import { parseResume as aiParseResume } from "../../lib/scorer.js";
import { fetchSkillCategories } from "../../lib/mcclawApi.js";

const COURSE_DICT = ["spanish", "creative writing", "statistics", "intro to photography", "chemistry"];
const asArr = (v) => (Array.isArray(v) ? v : []);

export default function ProfilePage({ profile, onSave, onQuiz, aiKey, model }) {
  const init = profile || { location: "Denver", hoursPerWeek: 15, remoteOk: true, years: 4, reputation: 42, skills: [], coursework: [], certifications: [] };
  const [f, setF] = useState({
    resumeText: "", transcriptText: "", wants: "", radius: 15, anyLocation: false, linkedin: false,
    ...init,
    projects: asArr(init.projects), categories: asArr(init.categories),
    days: asArr(init.days), times: asArr(init.times), locations: asArr(init.locations),
    skills: asArr(init.skills), coursework: asArr(init.coursework), certifications: asArr(init.certifications),
    slots: new Set(asArr(init.slots)),
  });
  const [parsed, setParsed] = useState(!!profile);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [pdfBusy, setPdfBusy] = useState("");
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

  const set = (k, v) => { setF((x) => ({ ...x, [k]: v })); setSaved(false); setDirty(true); };
  const toggle = (k, v) => set(k, (f[k] || []).includes(v) ? f[k].filter((x) => x !== v) : [...(f[k] || []), v]);

  // Parse the resume into structured profile fields. Uses Claude when an API key
  // is present (richer, infers years/skills), else the instant keyword parser.
  async function doParse() {
    const text = (f.resumeText || "").trim() || SAMPLE;
    if (aiKey) {
      setParsing(true);
      try {
        const p = await aiParseResume(aiKey, model, text);
        setF((x) => ({
          ...x,
          location: p.location || x.location,
          remoteOk: typeof p.remoteOk === "boolean" ? p.remoteOk : x.remoteOk,
          years: p.years ?? x.years,
          skills: Array.from(new Set([...(x.skills || []), ...(p.skills || [])])),
        }));
        setParsed(true); setSaved(false); setDirty(true); return;
      } catch (err) {
        setF((x) => ({ ...x, pdfNote: `Claude parse failed (${err.message || err}) — used keywords instead.` }));
      } finally { setParsing(false); }
    }
    const p = parseResumeKeywords(text);
    setF((x) => ({
      ...x,
      location: p.location || x.location,
      remoteOk: p.remoteOk ?? x.remoteOk,
      years: p.years ?? x.years,
      hoursPerWeek: p.hoursPerWeek ?? x.hoursPerWeek,
      skills: Array.from(new Set([...(x.skills || []), ...p.skills])),
      coursework: Array.from(new Set([...(x.coursework || []), ...p.coursework])),
    }));
    setParsed(true); setSaved(false); setDirty(true);
  }

  function parseTranscript() {
    const t = (f.transcriptText || "").toLowerCase();
    const found = COURSE_DICT.filter((c) => t.includes(c));
    if (found.length) setF((x) => ({ ...x, coursework: Array.from(new Set([...(x.coursework || []), ...found])) }));
    setSaved(false); setDirty(true);
  }

  // Extract text from an uploaded PDF (resume or transcript) in the browser.
  async function onPdf(e, field, nameField) {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    set(nameField, file.name);
    if (!isPdf(file)) { setF((x) => ({ ...x, pdfNote: "Not a PDF — paste the text above instead." })); return; }
    setPdfBusy(field);
    try {
      const text = await extractPdfText(file);
      setF((x) => ({ ...x, [field]: text || x[field], pdfNote: text ? "" : "No text found (scanned image?) — paste it above." }));
    } catch (err) {
      setF((x) => ({ ...x, pdfNote: `Couldn't read PDF: ${err.message || err}` }));
    } finally { setPdfBusy(""); }
  }

  function addProj() { const v = projDraft.trim(); if (v && !(f.projects || []).includes(v)) setF((x) => ({ ...x, projects: [...(x.projects || []), v] })); setProjDraft(""); setSaved(false); setDirty(true); }

  function doSave() {
    onSave({
      name: "You", location: f.location, remoteOk: f.remoteOk, years: f.years || 4,
      reputation: f.reputation || 42, skills: f.skills, coursework: f.coursework,
      certifications: f.certifications, hoursPerWeek: f.hoursPerWeek, days: f.days, times: f.times,
      slots: [...f.slots], radius: f.radius, locations: f.locations, anyLocation: f.anyLocation,
      linkedin: f.linkedin, projects: f.projects, resumeText: f.resumeText,
      transcriptText: f.transcriptText, transcriptName: f.transcriptName,
      categories: f.categories, wants: f.wants,
    });
    setSaved(true); setDirty(false);
  }

  return (
    <div className="prof">
      <div className="prof-head">
        <div>
          <h1 className="prof-h">Your profile</h1>
          <p className="prof-sub">This is what your agent presents to hiring agents — and what Claude matches you on.</p>
        </div>
        <div className="save-wrap">
          <button className={`btn save-top ${dirty && !saved ? "req" : ""}`} disabled={!dirty && !parsed} onClick={doSave}>{saved ? <><Check size={16} /> Saved</> : "Save profile"}</button>
          {dirty && !saved && <span className="save-note"><span className="sn-dot" /> Unsaved changes</span>}
        </div>
      </div>
      {onQuiz && (
        <div className="quiz-banner">
          <div className="qb-left"><Sparkles size={16} className="qb-ic" /><div><b>Not sure where to start?</b><span>Answer a few quick questions and we'll prefill this for you.</span></div></div>
          <button className="qb-btn" onClick={onQuiz}>Take the 2-min quiz <ArrowRight size={14} /></button>
        </div>
      )}
      <div className="prof-grid">
        <div className="prof-col">
          <div className="lbl">Import</div>
          <button className={`btn-ghost ${f.linkedin ? "connected" : ""}`} onClick={() => set("linkedin", !f.linkedin)} style={{ marginBottom: 4 }}>
            <Linkedin size={14} /> {f.linkedin ? "LinkedIn connected" : "Connect LinkedIn"}
          </button>

          <div className="lbl">Resume</div>
          <TypingBox value={f.resumeText} onChange={(e) => set("resumeText", e.target.value)} sample={SAMPLE} idle={"Paste or type your resume — name, experience, skills, coursework, availability…"} />
          <div className="inline" style={{ marginTop: 10, flexWrap: "wrap" }}>
            <button className="btn" disabled={parsing} onClick={doParse}>{parsing ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />} {aiKey ? "Parse with Claude" : "Parse resume"}</button>
            <label className="btn-ghost" style={{ cursor: "pointer" }}>{pdfBusy === "resumeText" ? <Loader2 size={14} className="spin" /> : <FileUp size={14} />} Upload PDF<input type="file" accept="application/pdf,.pdf" style={{ display: "none" }} onChange={(e) => onPdf(e, "resumeText", "fileName")} /></label>
          </div>
          {f.fileName && <div className="note">Resume: {f.fileName}</div>}

          <div className="lbl">Transcript</div>
          <TypingBox value={f.transcriptText} onChange={(e) => set("transcriptText", e.target.value)} sample={SAMPLE_TRANSCRIPT} idle={"Paste your transcript — courses, grades…"} />
          <div className="inline" style={{ marginTop: 10, flexWrap: "wrap" }}>
            <button className="btn" onClick={parseTranscript}><Sparkles size={14} /> Parse transcript</button>
            <label className="btn-ghost" style={{ cursor: "pointer" }}>{pdfBusy === "transcriptText" ? <Loader2 size={14} className="spin" /> : <FileText size={14} />} Upload transcript<input type="file" accept="application/pdf,.pdf" style={{ display: "none" }} onChange={(e) => onPdf(e, "transcriptText", "transcriptName")} /></label>
          </div>
          {f.transcriptName && <div className="note">Transcript: {f.transcriptName}</div>}
          {f.pdfNote && <div className="note" style={{ color: "var(--red)" }}>{f.pdfNote}</div>}
          <div className="note">Resume &amp; transcript PDFs are parsed in your browser. Claude reads the full resume text when it scores tasks.</div>

          <div className="lbl">Projects &amp; portfolio</div>
          <div className="inline" style={{ flexWrap: "wrap" }}>
            <input className="inp" style={{ flex: 1, minWidth: 150 }} placeholder="project name or link…" value={projDraft} onChange={(e) => setProjDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addProj()} />
            <button className="btn-ghost" onClick={addProj}><Plus size={14} /></button>
            <label className="btn-ghost" style={{ cursor: "pointer" }}><FileUp size={14} /> Upload<input type="file" multiple style={{ display: "none" }} onChange={(e) => { const names = [...(e.target.files || [])].map((x) => x.name); if (names.length) setF((x) => ({ ...x, projects: [...(x.projects || []), ...names] })); e.target.value = ""; }} /></label>
          </div>
          <div className="chips2">{(f.projects || []).map((p) => <span key={p} className="chip2"><FileText size={11} /> {p}<button onClick={() => set("projects", f.projects.filter((y) => y !== p))}><X size={11} /></button></span>)}</div>

          <div className="lbl">Skills</div>
          <ChipInput items={f.skills} placeholder="add skill…" suggestions={mcwSkills} listId="mcw-skill-list" onAdd={(v) => !f.skills.includes(v) && set("skills", [...f.skills, v])} onRemove={(v) => set("skills", f.skills.filter((x) => x !== v))} />
          {mcwSkills.length > 0 && <div className="note">{mcwSkills.length} skill suggestions live from the McClaw API</div>}

          <div className="lbl">Coursework</div>
          <ChipInput items={f.coursework} icon={GraduationCap} placeholder="add course…" onAdd={(v) => !f.coursework.includes(v) && set("coursework", [...f.coursework, v])} onRemove={(v) => set("coursework", f.coursework.filter((x) => x !== v))} />

          <div className="lbl">Certifications</div>
          <ChipInput items={f.certifications} icon={Award} placeholder="add certification…" onAdd={(v) => !f.certifications.includes(v) && set("certifications", [...f.certifications, v])} onRemove={(v) => set("certifications", f.certifications.filter((x) => x !== v))} />
        </div>
        <div className="prof-col">
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
          <WhenGrid value={f.slots} onChange={(s) => { const { days, times } = deriveAvail(s); setF((x) => ({ ...x, slots: s, days, times })); setSaved(false); setDirty(true); }} />
          {f.days.length ? <div className="note">Free: {f.days.join(", ")} · {f.times.join(", ") || "—"} · up to {f.hoursPerWeek}h/wk</div> : null}
        </div>
      </div>
      <CategoryPicker selected={f.categories || []} onToggle={(k) => toggle("categories", k)} wants={f.wants || ""} onWants={(v) => set("wants", v)} />
      <div className="prof-foot">
        <button className="btn save" disabled={!dirty && !parsed} onClick={doSave}>
          {saved ? <><Check size={15} /> Saved</> : "Save profile"}
        </button>
        {saved && <span className="note">Saved — Claude will re-rank your tasks. Check the Suggested tab.</span>}
      </div>
    </div>
  );
}
