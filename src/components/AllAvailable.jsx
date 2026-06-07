import React, { useState, useEffect } from "react";
import {
  Search, X, Mic, SlidersHorizontal, ChevronDown, TrendingUp, Flame, Mountain,
  MapPin, Shuffle, Wifi, CalendarCheck, CalendarX,
} from "lucide-react";
import TaskCard from "./TaskCard.jsx";
import { isRefuse, difficultyOf, fitsSchedule } from "../lib/heuristic.js";
import { modeOf } from "../lib/look.js";

const DIFF_FILTERS = [["all", "All", null], ["easy", "Easy to get", TrendingUp], ["mid", "Competitive", Flame], ["hard", "Hard to get", Mountain]];
const SCHED_SEGS = [["any", "Any schedule", null], ["fits", "Fits my schedule", CalendarCheck], ["nofit", "Doesn't fit", CalendarX]];
const MODE_FILTERS = [["all", "All", null], ["onsite", "In person", MapPin], ["hybrid", "Hybrid", Shuffle], ["remote", "Remote", Wifi]];
const SEARCH_SAMPLES = ["photography", "writing", "spanish", "voice", "verify", "notary"];

export default function AllAvailable({ tasks, profile, applied, onApply, scores }) {
  const [q, setQ] = useState("");
  const [diff, setDiff] = useState("all");
  const [sched, setSched] = useState("any");
  const [mode, setMode] = useState("all");
  const [pay, setPay] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [ph, setPh] = useState("");
  useEffect(() => {
    if (q) { setPh(""); return; }
    let ei = 0, ci = 0, dir = 1, to;
    const step = () => {
      const full = SEARCH_SAMPLES[ei];
      ci += dir; setPh(full.slice(0, ci));
      let d = dir === 1 ? 155 : 90;
      if (dir === 1 && ci >= full.length) { dir = -1; d = 1700; }
      else if (dir === -1 && ci <= 0) { dir = 1; ei = (ei + 1) % SEARCH_SAMPLES.length; d = 450; }
      to = setTimeout(step, d);
    };
    to = setTimeout(step, 700);
    return () => clearTimeout(to);
  }, [q]);
  const activeFilters = (mode !== "all" ? 1 : 0) + (diff !== "all" ? 1 : 0) + (sched !== "any" ? 1 : 0) + (pay > 0 ? 1 : 0);
  const list = tasks.filter((t) => {
    if (q && !`${t.title} ${(t.skills || []).join(" ")} ${t.desc} ${t.agent}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (mode !== "all" && modeOf(t) !== mode) return false;
    if (pay > 0 && t.pay < pay) return false;
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
          <input placeholder={q ? "" : ph ? `Search "${ph}▍"` : "Search tasks, skills, agents…"} value={q} onChange={(e) => setQ(e.target.value)} />
          {q && <button className="s-clear" onClick={() => setQ("")}><X size={15} /></button>}
          <button className="s-mic" title="Voice search"><Mic size={16} /></button>
        </div>
        <div className="s-samples">
          <span className="ss-lbl">Try</span>
          {SEARCH_SAMPLES.map((s) => <button key={s} className={`ss-chip ${q === s ? "on" : ""}`} onClick={() => setQ(q === s ? "" : s)}>{s}</button>)}
        </div>
        <button className="filt-toggle" onClick={() => setFiltersOpen((o) => !o)}>
          <SlidersHorizontal size={15} /><span className="filt-lbl">Filters</span>{activeFilters > 0 && <span className="filt-count">{activeFilters}</span>}
          <ChevronDown size={20} strokeWidth={2.6} className={`filt-chev ${filtersOpen ? "up" : ""}`} />
        </button>
        <div className={`fgroups ${filtersOpen ? "" : "collapsed"}`}>
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
                <button key={k} className={`fchip f-${k} ${diff === k ? "on" : ""}`} onClick={() => setDiff(k)}>{Icon && <Icon size={14} />}{label}</button>
              ))}
            </div>
          </div>
          <div className="fgroup fgroup-pay">
            <span className="fglabel">Pay</span>
            <input type="range" min="0" max="400" step="50" value={pay} style={{ flex: 1, accentColor: "#2fd286" }} onChange={(e) => setPay(+e.target.value)} />
            <span className="pay-val">{pay === 0 ? "Any" : `${pay}+ $MCLAW`}</span>
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
        : <div className="grid">{list.map((t) => <TaskCard key={t.id} task={t} profile={profile} applied={applied} onApply={onApply} tier={isRefuse(t) ? null : difficultyOf(t, profile, scores)} scores={scores} />)}</div>}
    </div>
  );
}
