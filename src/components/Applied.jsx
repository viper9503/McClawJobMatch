import React, { useState } from "react";
import { ArrowRight } from "lucide-react";
import { TaskModal } from "./TaskCard.jsx";

const APP_ST = { hired: { label: "Hired", c: "#2fd286" }, reviewing: { label: "Reviewing", c: "#9bd0ff" } };

export default function Applied({ tasks, applied, profile, jobStatus, scores }) {
  const [openId, setOpenId] = useState(null);
  const [filter, setFilter] = useState("all");
  const list = tasks.filter((t) => applied.includes(t.id));
  if (!list.length) return <div className="empty">No applications yet. Apply from <b>Suggested</b> or <b>All available</b>, and your agent negotiates on your behalf.</div>;
  const statusOf = (id) => (jobStatus && jobStatus[id]) ? "hired" : "reviewing";
  const hired = list.filter((t) => statusOf(t.id) === "hired").length;
  const shown = list.filter((t) => filter === "all" || statusOf(t.id) === filter);
  const openTask = tasks.find((t) => t.id === openId);
  const cards = [
    { key: "all", n: list.length, label: "Applications", color: "#eaf3ee" },
    { key: "hired", n: hired, label: "Hired", color: "#2fd286" },
    { key: "reviewing", n: list.length - hired, label: "In review", color: "#9bd0ff" },
  ];
  return (
    <div className="db">
      <div className="db-stats">
        {cards.map((c) => (
          <div key={c.key} className={"db-stat" + (filter === c.key ? " on" : "")} role="button" tabIndex={0}
            aria-pressed={filter === c.key} onClick={() => setFilter(c.key)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFilter(c.key); } }}>
            <b style={{ color: c.color }}>{c.n}</b><span>{c.label}</span>
          </div>
        ))}
      </div>
      <div className="db-table">
        <div className="db-th"><span>Task</span><span>Agent</span><span>Pay</span><span>Status</span><span>When</span><span /></div>
        {shown.length ? shown.map((t) => { const s = APP_ST[statusOf(t.id)]; return (
          <div className="db-tr" key={t.id} role="button" tabIndex={0} onClick={() => setOpenId(t.id)} onKeyDown={(e) => { if (e.key === "Enter") setOpenId(t.id); }}>
            <span className="db-task">{t.title}</span>
            <span className="db-mut">{t.agent}</span>
            <span className="db-pay">{t.pay} $MCLAW</span>
            <span className="db-st"><i className="db-dot" style={{ background: s.c }} />{s.label}</span>
            <span className="db-mut">{t.posted ? `${t.posted} ago` : "—"}</span>
            <span className="db-go"><ArrowRight size={15} /></span>
          </div>); }) : <div className="db-none">No {filter === "hired" ? "hired" : "in-review"} applications.</div>}
      </div>
      {openTask && <TaskModal task={openTask} profile={profile} scores={scores} isApplied={true} onApply={() => {}} onClose={() => setOpenId(null)} />}
    </div>
  );
}
