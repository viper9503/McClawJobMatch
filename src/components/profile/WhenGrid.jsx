import React, { useRef, useEffect } from "react";

export const WK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 18 }, (_, i) => 6 + i); // 6:00 .. 23:00
const fmtHour = (h) => (h === 12 ? "12p" : h > 12 ? `${h - 12}p` : `${h}a`);
const slotWindow = (h) => (h < 12 ? "morning" : h < 17 ? "afternoon" : h < 21 ? "evening" : "night");

// Collapse the painted slot set into day + time-window summaries the matcher uses.
export function deriveAvail(slots) {
  const arr = [...slots];
  const days = WK_DAYS.filter((d) => arr.some((k) => k.startsWith(d + "-")));
  const w = new Set(arr.map((k) => slotWindow(+k.split("-")[1])));
  const times = ["morning", "afternoon", "evening", "night"].filter((x) => w.has(x));
  return { days, times };
}

// When-to-meet style availability grid — drag to paint the slots you can work.
export default function WhenGrid({ value, onChange }) {
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
