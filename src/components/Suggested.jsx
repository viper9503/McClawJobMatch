import React from "react";
import TaskCard from "./TaskCard.jsx";
import { isRefuse, getScore, tierOf, TIERS } from "../lib/heuristic.js";

export default function Suggested({ tasks, profile, applied, onApply, scores, goProfile, onQuiz }) {
  if (!profile) return (
    <div className="empty">
      Take a 2-minute quiz and your agent starts matching you right away.{" "}
      <button className="link" onClick={onQuiz}>Take the quiz →</button>{" "}
      <span className="empty-or">or</span>{" "}
      <button className="link" onClick={goProfile}>build a full profile</button>
    </div>
  );
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
            {buckets[tier.key].map((t) => <TaskCard key={t.id} task={t} profile={profile} applied={applied} onApply={onApply} tier={tier} scores={scores} />)}
          </div>
        </section>
      ))}
    </div>
  );
}
