import React from "react";
import { Coins, Wifi, MapPin, Shuffle, Clock, Briefcase, Check, MessageCircle, Bot, ShieldCheck } from "lucide-react";
import { modeOf } from "../lib/look.js";

const STAGES = ["Hired", "In progress", "Submitted", "Validating", "Paid"];
const JOB_STATUS = {
  in_progress: { label: "In progress", c: "#9bd0ff", stageIdx: 1, next: "submitted", action: "Submit work" },
  submitted: { label: "Awaiting validation", c: "#ffd27a", stageIdx: 3, next: "paid", action: "Mark validated" },
  paid: { label: "Paid", c: "#2fd286", stageIdx: 4, next: null, action: null },
};
const JOB_NOTE = {
  in_progress: (a) => `${a} is waiting on your submission.`,
  submitted: (a) => `${a}'s validator is reviewing your work — no action needed.`,
  paid: (a) => `Validated by ${a} · escrow released to your wallet.`,
};

function StageTrack({ active, accent }) {
  return (
    <div className="stages">
      {STAGES.map((label, i) => {
        const done = i < active, on = i === active;
        return (
          <React.Fragment key={label}>
            {i > 0 && <span className={`stage-link ${i <= active ? "fill" : ""}`} style={i === active ? { background: accent } : undefined} />}
            <div className="stage-node">
              <span className={`stage-dot ${done ? "done" : on ? "on" : ""}`} style={on ? { background: accent, boxShadow: `0 0 0 4px ${accent}2e` } : undefined}>
                {done && <Check size={11} strokeWidth={3} color="#06150e" />}
              </span>
              <em className={on ? "cur" : ""}>{label}</em>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function WorkingOn({ tasks, applied, jobStatus, onAdvance }) {
  const jobs = applied.map((id) => tasks.find((t) => t.id === id)).filter(Boolean);
  if (!jobs.length) return <div className="empty">Nothing in progress yet. When you take on a task it shows up here with its status, escrow, and next step.</div>;
  return (
    <div className="jobs">
      {jobs.map((t) => {
        const key = jobStatus[t.id] || "in_progress"; const st = JOB_STATUS[key];
        const where = t.remote ? "Remote" : modeOf(t) === "hybrid" ? `Hybrid · ${t.location}` : t.location;
        return (
          <div className="job" key={t.id}>
            <div className="job-top">
              <div><h3 className="job-title">{t.title}</h3>
                <div className="job-agent"><ShieldCheck size={12} color="#2fd286" /> {t.agent}</div></div>
              <span className="job-status" style={{ color: st.c, borderColor: st.c }}>{st.label}</span>
            </div>
            <StageTrack active={st.stageIdx} accent={st.c} />
            <div className="job-meta">
              <span><Coins size={12} />{t.pay} $MCLAW {key === "in_progress" ? "· releases on validation" : key === "paid" ? "released" : "in escrow"}</span>
              <span>{t.remote ? <Wifi size={12} /> : modeOf(t) === "hybrid" ? <Shuffle size={12} /> : <MapPin size={12} />}{where}</span>
              <span><Clock size={12} />~{t.timeCommitmentHours}h</span>
              <span><Briefcase size={12} />Hired {t.posted ? `${t.posted} ago` : "recently"}</span>
            </div>
            <div className="job-note"><Bot size={13} color={st.c} /> {(JOB_NOTE[key] || (() => ""))(t.agent)}</div>
            <div className="job-actions">
              {st.next ? <button className="job-go" onClick={() => onAdvance(t.id, st.next)}>{st.action}</button> : <span className="job-paid"><Check size={14} /> Funds released to your wallet</span>}
              <button className="job-msg"><MessageCircle size={14} /> Message {t.agent}</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
