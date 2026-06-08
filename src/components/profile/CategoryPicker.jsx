import React from "react";
import { Check, Flame } from "lucide-react";
import { CATEGORIES, CAT_META } from "../../data/tasks.js";

// Category preference picker + free-text "in your own words" box. What the human
// chooses here boosts those categories in the matcher and is woven into the
// dossier Claude reads.
export default function CategoryPicker({ selected, onToggle, wants, onWants }) {
  const top = CATEGORIES.slice(0, 3);
  return (
    <section className="cgp">
      <div className="lbl" style={{ marginTop: 0 }}>Task categories you want</div>
      <p className="cgp-desc">Tell your agent the kinds of work you want — we prioritize these in your matches. You'll still see everything else, and you can change it anytime.</p>
      <div className="cgp-grid">
        {CATEGORIES.map(([k, label, Icon]) => (
          <button key={k} className={`cgp-card ${selected.includes(k) ? "on" : ""}`} onClick={() => onToggle(k)}>
            <div className="cgp-h"><Icon size={20} /></div>
            <b>{label}</b>
            <p>{CAT_META[k].desc}</p>
            {selected.includes(k) && <span className="cgp-check"><Check size={13} /></span>}
          </button>
        ))}
      </div>
      <div className="lbl">In your own words</div>
      <textarea className="cgp-free" placeholder="Anything specific? e.g. short photography gigs near Denver, async writing, weekend-only work, nothing that needs a phone call…" value={wants} onChange={(e) => onWants(e.target.value)} />
      <div className="cgp-topbar bottom">
        <span className="cgp-toplbl"><Flame size={13} /> Top categories</span>
        {top.map(([k, label, Icon]) => (
          <button key={k} className={`cgp-topchip ${selected.includes(k) ? "on" : ""}`} onClick={() => onToggle(k)}><Icon size={13} />{label}</button>
        ))}
      </div>
    </section>
  );
}
