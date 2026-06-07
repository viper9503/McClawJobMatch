import React from "react";
import { Sparkles, KeyRound, X, Loader2, Database, ShieldAlert, Shuffle } from "lucide-react";
import { MODELS } from "../config.js";

// One bar under the app header for the two optional API connections:
//  - Claude (Anthropic key) → real AI scoring of the board
//  - McClaw (X-API-Key)     → swap the demo board for the live task feed
// Both keys live only in localStorage; nothing is sent anywhere but those APIs.
export default function ConnectBar({
  aiKey, setAiKey, model, setModel, profile, scoring, progress, scoredCount, onScore, onCancel, goProfile,
  mcclawKey, setMcclawKey, tasksLoading, tasksError, liveCount, onRefresh,
}) {
  return (
    <div className="matchbar">
      {/* --- Claude / AI scoring --- */}
      {aiKey
        ? <span className="mb-status"><Sparkles size={13} /> Claude ready</span>
        : <span className="mb-status off"><KeyRound size={13} /> AI matching off</span>}
      {!aiKey && (
        <input className="mb-key inp" type="password" placeholder="Anthropic API key (stays in your browser)…"
          value={aiKey} onChange={(e) => setAiKey(e.target.value.trim())} />
      )}
      {aiKey && (
        <>
          <select className="mb-select" value={model} onChange={(e) => setModel(e.target.value)}>
            <option value={MODELS.fast}>Haiku 4.5 · fast</option>
            <option value={MODELS.quality}>Sonnet 4.6 · sharper</option>
          </select>
          {scoring ? (
            <>
              <div className="mb-prog"><div style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} /></div>
              <span className="mb-status">{progress.done}/{progress.total}</span>
              <button className="btn-ghost" onClick={onCancel}><X size={14} /> Cancel</button>
            </>
          ) : (
            <button className="btn" disabled={!profile} title={!profile ? "Save your profile first" : ""} onClick={onScore}>
              <Sparkles size={14} /> {scoredCount > 0 ? "Re-score with Claude" : "Score tasks with Claude"}
            </button>
          )}
          {!profile && <button className="link" onClick={goProfile}>Set up profile →</button>}
          {scoredCount > 0 && !scoring && <span className="mb-status">{scoredCount} scored</span>}
        </>
      )}

      <span className="mb-sep" />

      {/* --- McClaw live task feed --- */}
      {mcclawKey
        ? tasksLoading
          ? <span className="mb-status"><Loader2 size={13} className="spin" /> Loading…</span>
          : tasksError
            ? <span className="mb-status off"><ShieldAlert size={13} /> McClaw: {tasksError}</span>
            : <span className="mb-status"><Database size={13} /> {liveCount} live {liveCount === 1 ? "task" : "tasks"}</span>
        : <span className="mb-status off"><Database size={13} /> Demo board · connect McClaw for live tasks</span>}
      <input className="mb-key inp" type="password" placeholder="McClaw X-API-Key…"
        value={mcclawKey} onChange={(e) => setMcclawKey(e.target.value.trim())} />
      <button className="btn-ghost" onClick={onRefresh} disabled={!mcclawKey || tasksLoading}>
        {tasksLoading ? <Loader2 size={14} className="spin" /> : <Shuffle size={14} />} Refresh
      </button>
    </div>
  );
}
