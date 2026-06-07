import React, { useState, useRef } from "react";
import { Plus, X } from "lucide-react";
import { searchLocations } from "../../lib/mcclawApi.js";

// Tag input with optional live suggestions (datalist).
export function ChipInput({ items, onAdd, onRemove, placeholder, icon: I, suggestions, listId }) {
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

// City field with live autocomplete backed by McClaw's public /config/locations
// endpoint (no auth). Falls back to a plain text field if offline.
export function LocationInput({ value, onChange, disabled }) {
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
