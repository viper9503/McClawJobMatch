import React, { useState } from "react";
import { ArrowRight } from "lucide-react";
import { QUIZ_CSS } from "../styles.js";

const QUIZ_CATS = [["content", "Content"], ["data", "Data"], ["research", "Research"], ["verification", "Verification"], ["testing", "Testing"], ["creative", "Creative"], ["real-world", "Real-World"]];
const QUIZ_COMFORT = [
  ["writing", "Writing and editing text"], ["ai review", "Reviewing AI outputs"], ["research", "Online research"],
  ["fact-checking", "Fact-checking information"], ["spreadsheets", "Working with spreadsheets"], ["qa", "Testing websites / apps"],
  ["design", "Evaluating design or visual content"], ["photography", "Taking photos"], ["phone", "Making phone calls"], ["fieldwork", "Visiting locations in person"],
];
const QUIZ_TIME = ["Under 15 minutes", "15–30 minutes", "30–60 minutes", "1+ hour"];
const QUIZ_TRAVEL = [["Under 5 miles", 5], ["5–10 miles", 10], ["10–25 miles", 25], ["25+ miles", 40]];
const QUIZ_PERSONA = ["I enjoy detailed, analytical work", "I enjoy creative work", "I enjoy interacting with people", "I enjoy hands-on real-world tasks"];
const QUIZ_PRIORITY = ["Highest payout", "Shortest completion time", "Tasks that match my interests", "Tasks that help me build skills"];

export function quizToProfile(a) {
  const ratings = a.ratings || {};
  const categories = QUIZ_CATS.filter(([k]) => (ratings[k] || 0) >= 4).map(([k]) => k);
  const skills = a.comfortable || [];
  const inPerson = a.inPerson === "Yes";
  const persona = { "I enjoy detailed, analytical work": "analytical, detail-oriented work", "I enjoy creative work": "creative work", "I enjoy interacting with people": "people-facing work", "I enjoy hands-on real-world tasks": "hands-on real-world tasks" }[a.persona];
  const prio = { "Highest payout": "highest payout", "Shortest completion time": "quick tasks", "Tasks that match my interests": "tasks matching my interests", "Tasks that help me build skills": "skill-building tasks" }[a.priority];
  const wants = [persona && `Enjoys ${persona}`, a.time && `Prefers ${a.time.toLowerCase()} tasks`, prio && `Values ${prio}`].filter(Boolean).join(". ");
  return {
    name: "You", location: inPerson ? (a.city || "").trim() || "Denver" : "Remote",
    remoteOk: true, years: 1, reputation: 42, skills, coursework: [], certifications: [],
    hoursPerWeek: 15, days: [], times: [], slots: [], radius: inPerson ? (a.travel || 25) : 0,
    locations: [], anyLocation: false, linkedin: false, projects: [], resumeText: "",
    categories, wants, taskTime: a.time || "", persona: a.persona || "", priority: a.priority || "", inPerson,
  };
}

const QUIZ_STEPS = ["ratings", "comfortable", "time", "inPerson", "city", "travel", "persona", "priority"];

export default function OnboardingQuiz({ onComplete, onSkip, onClose }) {
  const [a, setA] = useState({ ratings: {}, comfortable: [] });
  const [i, setI] = useState(0);
  const steps = QUIZ_STEPS.filter((s) => !(s === "travel" && a.inPerson === "No"));
  const id = steps[i];
  const set = (k, v) => setA((x) => ({ ...x, [k]: v }));
  const setRating = (cat, n) => setA((x) => ({ ...x, ratings: { ...x.ratings, [cat]: n } }));
  const toggleComfort = (k) => setA((x) => ({ ...x, comfortable: x.comfortable.includes(k) ? x.comfortable.filter((c) => c !== k) : [...x.comfortable, k] }));
  const last = i === steps.length - 1;
  const next = () => { if (last) onComplete(quizToProfile(a)); else setI((n) => Math.min(n + 1, steps.length - 1)); };
  const back = () => { if (i === 0) onClose(); else setI((n) => n - 1); };

  return (
    <div className="quiz-wrap">
      <style>{QUIZ_CSS}</style>
      <div className="quiz-top">
        <div className="quiz-logo mono">&gt;_ McMatcher</div>
        <button className="quiz-skip" onClick={onSkip}>Skip for now <ArrowRight size={14} /></button>
      </div>
      <div className="quiz-stage">
        <div className="quiz-card">
          <div className="quiz-progress"><span style={{ width: `${((i + 1) / steps.length) * 100}%` }} /></div>
          <div className="quiz-step mono">QUESTION {i + 1} / {steps.length}</div>

          {id === "ratings" && (<>
            <h2 className="quiz-q">What kinds of tasks do you want?</h2>
            <p className="quiz-sub">Rate each from 1 (not interested) to 5 (love it).</p>
            <div className="quiz-rate">{QUIZ_CATS.map(([k, label]) => (
              <div className="qr-row" key={k}>
                <span className="qr-cat">{label}</span>
                <div className="qr-dots">{[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} className={`qr-dot ${(a.ratings[k] || 0) >= n ? "on" : ""}`} onClick={() => setRating(k, n)}>{n}</button>
                ))}</div>
              </div>))}</div>
          </>)}

          {id === "comfortable" && (<>
            <h2 className="quiz-q">Which of these are you comfortable doing?</h2>
            <p className="quiz-sub">Select all that apply.</p>
            <div className="quiz-chips">{QUIZ_COMFORT.map(([k, label]) => (
              <button key={k} className={`quiz-chip ${a.comfortable.includes(k) ? "on" : ""}`} onClick={() => toggleComfort(k)}>{a.comfortable.includes(k) ? "✓ " : ""}{label}</button>
            ))}</div>
          </>)}

          {id === "time" && (<>
            <h2 className="quiz-q">How long should a typical task take?</h2>
            <p className="quiz-sub">We'll prioritize tasks around this length.</p>
            <div className="quiz-opts">{QUIZ_TIME.map((o) => (
              <button key={o} className={`quiz-opt ${a.time === o ? "on" : ""}`} onClick={() => set("time", o)}><span className="qo-dot" />{o}</button>
            ))}</div>
          </>)}

          {id === "inPerson" && (<>
            <h2 className="quiz-q">Are you willing to do in-person tasks?</h2>
            <p className="quiz-sub">Photos, drive-bys, errands — real-world work pays more.</p>
            <div className="quiz-opts">{["Yes", "No"].map((o) => (
              <button key={o} className={`quiz-opt ${a.inPerson === o ? "on" : ""}`} onClick={() => set("inPerson", o)}><span className="qo-dot" />{o === "Yes" ? "Yes — I'll go on location" : "No — remote tasks only"}</button>
            ))}</div>
          </>)}

          {id === "city" && (<>
            <h2 className="quiz-q">What city are you in?</h2>
            <p className="quiz-sub">{a.inPerson === "No" ? "Optional — you chose remote-only, so this just helps timezone matching." : "So we can match nearby real-world tasks."}</p>
            <input className="quiz-input" placeholder="e.g. Denver, CO" value={a.city || ""} onChange={(e) => set("city", e.target.value)} />
          </>)}

          {id === "travel" && (<>
            <h2 className="quiz-q">How far will you travel?</h2>
            <p className="quiz-sub">For in-person tasks.</p>
            <div className="quiz-opts">{QUIZ_TRAVEL.map(([label, mi]) => (
              <button key={label} className={`quiz-opt ${a.travel === mi ? "on" : ""}`} onClick={() => set("travel", mi)}><span className="qo-dot" />{label}</button>
            ))}</div>
          </>)}

          {id === "persona" && (<>
            <h2 className="quiz-q">Which sounds most like you?</h2>
            <p className="quiz-sub">Pick one — it tunes how we rank your matches.</p>
            <div className="quiz-opts">{QUIZ_PERSONA.map((o) => (
              <button key={o} className={`quiz-opt ${a.persona === o ? "on" : ""}`} onClick={() => set("persona", o)}><span className="qo-dot" />{o}</button>
            ))}</div>
          </>)}

          {id === "priority" && (<>
            <h2 className="quiz-q">What matters most when you pick a task?</h2>
            <p className="quiz-sub">Pick one.</p>
            <div className="quiz-opts">{QUIZ_PRIORITY.map((o) => (
              <button key={o} className={`quiz-opt ${a.priority === o ? "on" : ""}`} onClick={() => set("priority", o)}><span className="qo-dot" />{o}</button>
            ))}</div>
          </>)}

          <div className="quiz-nav">
            <button className="quiz-back" onClick={back}>{i === 0 ? "Back to home" : "← Back"}</button>
            <button className="quiz-next" onClick={next}>{last ? "See my matches →" : "Next →"}</button>
          </div>
        </div>
        <p className="quiz-foot">Takes about 2 minutes · You can change all of this later in your profile.</p>
      </div>
    </div>
  );
}
