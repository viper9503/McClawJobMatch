import React, { useState, useEffect } from "react";
import {
  X, ShieldCheck, ShieldAlert, Coins, Wifi, MapPin, Clock, Briefcase, Check, Shuffle, Sparkles,
} from "lucide-react";
import { GRADS } from "../data/tasks.js";
import { iconFor, photoSrc, genAbout, modeOf, hash } from "../lib/look.js";
import { isRefuse, getScore, difficultyOf } from "../lib/heuristic.js";

// Claude's per-task verdict (one-liner + rationale + matched/missing skills),
// shown both on the card and in the modal when a task was AI-scored.
function AiVerdict({ m, compact }) {
  if (!m || m.source !== "ai" || !(m.oneLiner || m.rationale)) return null;
  return (
    <div className={compact ? "tc-ai" : "tm-ai"}>
      {compact
        ? <>
            {m.oneLiner && <div className="tc-oneliner">{m.oneLiner}</div>}
            {m.rationale && <p className="tc-rationale">{m.rationale}</p>}
          </>
        : <>
            <b><Sparkles size={13} /> Claude's read</b>
            {m.oneLiner && <p style={{ fontWeight: 700, marginBottom: 6 }}>{m.oneLiner}</p>}
            {m.rationale && <p>{m.rationale}</p>}
          </>}
      {(m.matched?.length > 0 || m.missing?.length > 0) && (
        <div className="tc-chips">
          {(m.matched || []).slice(0, 4).map((s) => <span key={`h-${s}`} className="tc-chip have"><Check size={9} />{s}</span>)}
          {(m.missing || []).slice(0, 3).map((s) => <span key={`m-${s}`} className="tc-chip miss"><X size={9} />{s}</span>)}
        </div>
      )}
    </div>
  );
}

export function TaskModal({ task, profile, scores, isApplied, onApply, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey); document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);
  const refuse = isRefuse(task);
  const m = refuse ? null : getScore(task, profile, scores);
  const diff = difficultyOf(task, profile, scores);
  const Icon = iconFor(task, m); const grad = GRADS[hash(task.id) % GRADS.length];
  const mode = modeOf(task);
  const modeLabel = mode === "remote" ? "Remote" : mode === "hybrid" ? `Hybrid · ${task.location}` : task.location;
  return (
    <div className="tmodal" onClick={onClose}>
      <div className="tmodal-card" onClick={(e) => e.stopPropagation()}>
        <button className="tmodal-x" onClick={onClose}><X size={18} /></button>
        <div className="tm-hero" style={{ background: refuse ? "#3a1410" : grad }}>
          {!refuse && <img className="tc-photo" src={photoSrc(task, 900, 420)} alt="" />}
          {!refuse && <div className="tc-tint" style={{ backgroundImage: grad }} />}
          {!refuse && <div className="tc-scrim" />}
          {refuse ? <ShieldAlert size={34} color="#ff8a72" /> : <Icon size={28} color="#fff" className="tc-ic" />}
          {!refuse && <span className={`tc-tier tier-${diff.key}`}>{diff.label}</span>}
        </div>
        <div className="tm-body">
          <div className="tm-top">
            <div><h2 className="tm-title">{task.title}</h2>
              <div className="tm-agent">{task.verified ? <ShieldCheck size={13} color="#2fd286" /> : <ShieldAlert size={13} color="#ff8a72" />} {task.agent}{(m && m.category) ? ` · ${m.category}` : ""}</div></div>
            {m && <span className="tm-match">{m.total}% match</span>}
          </div>
          {refuse ? (
            <div className="tm-warn">
              <b><ShieldAlert size={15} /> Your agent declined this task for you.</b>
              <p>{task.desc}</p>
              <p>It asks for actions that put your account or safety at risk, so McMatcher flagged it — your agent won't accept on your behalf.</p>
            </div>
          ) : (
            <>
              <div className="tm-stats">
                <div><Coins size={15} /><b>{task.pay} $MCLAW</b><span>Pay</span></div>
                <div>{mode === "remote" ? <Wifi size={15} /> : mode === "hybrid" ? <Shuffle size={15} /> : <MapPin size={15} />}<b>{modeLabel}</b><span>Where</span></div>
                <div><Clock size={15} /><b>{task.schedule}</b><span>Schedule</span></div>
                <div><Briefcase size={15} /><b>~{task.timeCommitmentHours}h</b><span>Time</span></div>
              </div>
              <AiVerdict m={m} />
              <div className="tm-sec"><h4>About this task</h4><p>{task.desc}</p><p>{genAbout(task)}</p></div>
              <div className="tm-sec"><h4>What you'll need</h4>
                <div className="tm-skills">{(task.skills || []).map((s) => <span key={s} className="tm-skill">{s}</span>)}</div>
                {(task.minReputation > 0 || task.minYears > 0) && <p className="tm-req">{task.minReputation > 0 ? `Reputation ${task.minReputation}+` : ""}{task.minReputation > 0 && task.minYears > 0 ? " · " : ""}{task.minYears > 0 ? `${task.minYears}+ yrs experience` : ""}{m && m.gated ? " — you don't meet the bar yet" : ""}</p>}
                {!task.verified && <p className="tm-caution"><ShieldAlert size={12} /> This agent isn't verified yet — review the terms carefully.</p>}
              </div>
              <div className="tm-sec"><h4>How you get paid</h4><p>{task.pay} $MCLAW is locked in escrow the moment you're hired. A validator confirms your result, then funds release straight to your wallet — usually within minutes.</p></div>
              <button className={`tc-apply lg ${isApplied ? "done" : ""}`} disabled={isApplied} onClick={() => onApply(task.id)}>{isApplied ? <><Check size={15} /> Applied</> : "Apply via your agent"}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TaskCard({ task, profile, applied, onApply, tier, scores }) {
  const refuse = isRefuse(task);
  const m = refuse ? null : getScore(task, profile, scores);
  const Icon = iconFor(task, m); const grad = GRADS[hash(task.id) % GRADS.length];
  const isApplied = applied.includes(task.id);
  const cat = (m && m.category) || "";
  const [open, setOpen] = useState(false);
  return (
    <>
    <div className={`tc clickable ${refuse ? "refuse" : ""}`} onClick={() => setOpen(true)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") setOpen(true); }}>
      <div className="tc-thumb" style={{ background: refuse ? "#3a1410" : grad }}>
        {!refuse && <img className="tc-photo" src={photoSrc(task, 640, 380)} alt="" loading="lazy" />}
        {!refuse && <div className="tc-tint" style={{ backgroundImage: grad }} />}
        {!refuse && <div className="tc-scrim" />}
        {refuse ? <ShieldAlert size={30} color="#ff8a72" /> : <Icon size={26} color="#fff" className="tc-ic" />}
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
              <span><Coins size={11} />{task.pay}</span>
              <span>{modeOf(task) === "remote" ? <><Wifi size={11} />Remote</> : modeOf(task) === "hybrid" ? <><Shuffle size={11} />Hybrid · {task.location}</> : <><MapPin size={11} />{task.location}</>}</span>
              <span><Clock size={11} />{task.schedule}</span>
            </div>
            <AiVerdict m={m} compact />
            {m && m.gated && profile && <div className="tc-gate">Needs reputation {task.minReputation} (you: {profile.reputation})</div>}
            <button className={`tc-apply ${isApplied ? "done" : ""}`} disabled={isApplied} onClick={(e) => { e.stopPropagation(); onApply(task.id); }}>
              {isApplied ? <><Check size={14} /> Applied</> : "Apply via your agent"}
            </button>
          </>
        )}
      </div>
    </div>
    {open && <TaskModal task={task} profile={profile} scores={scores} isApplied={isApplied} onApply={(id) => { onApply(id); }} onClose={() => setOpen(false)} />}
    </>
  );
}
