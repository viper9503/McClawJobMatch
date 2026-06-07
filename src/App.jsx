import React, { useState, useMemo, useRef, useEffect } from "react";
import { Settings } from "lucide-react";

import { STYLE } from "./styles.js";
import { TASKS } from "./data/tasks.js";
import { scoreTasksWithAI } from "./lib/aiScore.js";
import { fetchOpenTasks } from "./lib/mcclawApi.js";
import { load, save } from "./lib/storage.js";
import { LS, DEFAULT_MODEL, ENV_ANTHROPIC_KEY, ENV_MCCLAW_KEY, MAX_LLM_JOBS } from "./config.js";

import Landing from "./components/Landing.jsx";
import OnboardingQuiz from "./components/OnboardingQuiz.jsx";
import ConnectBar from "./components/ConnectBar.jsx";
import PageBoundary from "./components/PageBoundary.jsx";
import Suggested from "./components/Suggested.jsx";
import AllAvailable from "./components/AllAvailable.jsx";
import Applied from "./components/Applied.jsx";
import WorkingOn from "./components/WorkingOn.jsx";
import SettingsPage from "./components/Settings.jsx";
import ProfilePage from "./components/profile/ProfilePage.jsx";

const TABS = [["suggested", "Suggested"], ["all", "All available"], ["working", "Working on"], ["applied", "Applied"], ["profile", "Profile"]];

export default function App() {
  const [screen, setScreen] = useState("landing");
  const [tab, setTab] = useState("suggested");
  const [profile, setProfile] = useState(() => load(LS.profile, null));
  const [applied, setApplied] = useState(() => load(LS.applied, ["t1", "t3"]));
  const [jobStatus, setJobStatus] = useState(() => load(LS.jobStatus, { t1: "in_progress", t3: "submitted" }));

  // Live McClaw task board (optional — the demo TASKS are the default).
  const [mcclawKey, setMcclawKey] = useState(() => load(LS.mcclawKey, ENV_MCCLAW_KEY));
  const [liveTasks, setLiveTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState(null);
  const [taskNonce, setTaskNonce] = useState(0);

  // Claude scoring.
  const [aiKey, setAiKey] = useState(() => load(LS.anthropicKey, ENV_ANTHROPIC_KEY));
  const [model, setModel] = useState(() => load(LS.model, DEFAULT_MODEL));
  const [scores, setScores] = useState({});
  const [scoring, setScoring] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const scoreCtrl = useRef(null);

  // The active board: live McClaw tasks when connected + loaded, else the demo set.
  const board = useMemo(() => (mcclawKey && liveTasks.length ? liveTasks : TASKS), [mcclawKey, liveTasks]);
  // Switching boards (demo ↔ live) makes any existing Claude scores stale — their
  // task ids belong to the previous board — so drop them.
  useEffect(() => { setScores({}); }, [board]);

  useEffect(() => save(LS.anthropicKey, aiKey), [aiKey]);
  useEffect(() => save(LS.model, model), [model]);
  useEffect(() => save(LS.profile, profile), [profile]);
  useEffect(() => save(LS.mcclawKey, mcclawKey), [mcclawKey]);
  useEffect(() => save(LS.applied, applied), [applied]);
  useEffect(() => save(LS.jobStatus, jobStatus), [jobStatus]);

  // Pull the live board whenever the key changes or the user hits Refresh.
  useEffect(() => {
    if (!mcclawKey) { setLiveTasks([]); setTasksError(null); setTasksLoading(false); return; }
    const ctrl = new AbortController();
    setTasksLoading(true); setTasksError(null);
    fetchOpenTasks({ apiKey: mcclawKey, signal: ctrl.signal })
      .then((list) => { setLiveTasks(list); setTasksError(null); })
      .catch((err) => { if (!ctrl.signal.aborted) setTasksError(err?.message || String(err)); })
      .finally(() => { if (!ctrl.signal.aborted) setTasksLoading(false); });
    return () => ctrl.abort();
  }, [mcclawKey, taskNonce]);
  const refreshTasks = () => setTaskNonce((n) => n + 1);

  const scoredCount = useMemo(() => Object.values(scores).filter((s) => s && !s.error).length, [scores]);

  async function runScoring(p) {
    const prof = p || profile;
    if (!aiKey || !prof) return;
    const controller = new AbortController();
    scoreCtrl.current = controller;
    setScoring(true); setProgress({ done: 0, total: 0 });
    try {
      await scoreTasksWithAI(aiKey, model, prof, board, {
        limit: MAX_LLM_JOBS, // cap LLM calls on large (live) boards; rest keep heuristic scores
        signal: controller.signal,
        onProgress: (done, total) => setProgress({ done, total }),
        onResult: (id, res) => setScores((prev) => ({ ...prev, [id]: res })),
      });
    } catch (err) {
      if (!controller.signal.aborted) console.error("AI scoring failed:", err);
    } finally {
      setScoring(false); scoreCtrl.current = null;
    }
  }
  function cancelScoring() { scoreCtrl.current?.abort(); setProgress({ done: 0, total: 0 }); }

  function applyProfile(p) {
    setProfile(p);
    setScores({}); // profile changed → old scores are stale
    if (aiKey) runScoring(p); // auto re-rank with Claude when connected
  }

  const onApply = (id) => {
    if (!profile) { setTab("profile"); return; }
    setApplied((a) => (a.includes(id) ? a : [...a, id]));
    setJobStatus((s) => (s[id] ? s : { ...s, [id]: "in_progress" }));
  };
  const advance = (id, next) => setJobStatus((s) => ({ ...s, [id]: next }));
  const activeCount = applied.filter((id) => (jobStatus[id] || "in_progress") !== "paid").length;
  const enter = (t) => { setTab(t); setScreen("app"); };
  const finishQuiz = (p) => { applyProfile(p); enter("suggested"); };
  const resetProfile = () => { save(LS.profile, null); window.location.reload(); };

  return (
    <div className="root">
      <style>{STYLE}</style>
      {screen === "landing" ? (
        <Landing onSignup={() => setScreen("quiz")} onEnter={() => enter("suggested")} onBrowse={() => enter("all")} />
      ) : screen === "quiz" ? (
        <OnboardingQuiz onComplete={finishQuiz} onSkip={() => enter("all")} onClose={() => setScreen("landing")} />
      ) : (
        <>
          <header className="appbar bitmap">
            <button className="ab-logo mono" title="McMatcher home" onClick={() => setTab(profile ? "suggested" : "all")}>&gt;_ McMatcher</button>
            {TABS.map(([k, label]) => (
              <button key={k} className={`tab ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>
                {tab === k && <span className="tmk">›</span>}{label.toUpperCase()}{k === "applied" && applied.length ? ` (${applied.length})` : ""}{k === "working" && activeCount ? ` (${activeCount})` : ""}
              </button>
            ))}
            <div className="ab-prof">{profile ? `${profile.location} · ${profile.hoursPerWeek}h/wk · rep ${profile.reputation}` : "— no profile"}</div>
            <button className={`ab-gear ${tab === "settings" ? "on" : ""}`} title="Settings" onClick={() => setTab("settings")}><Settings size={17} /></button>
          </header>
          <ConnectBar
            aiKey={aiKey} setAiKey={setAiKey} model={model} setModel={setModel} profile={profile}
            scoring={scoring} progress={progress} scoredCount={scoredCount}
            onScore={() => runScoring()} onCancel={cancelScoring} goProfile={() => setTab("profile")}
            mcclawKey={mcclawKey} setMcclawKey={setMcclawKey}
            tasksLoading={tasksLoading} tasksError={tasksError} liveCount={liveTasks.length} onRefresh={refreshTasks}
          />
          <main className="page">
            <PageBoundary key={tab} onReset={resetProfile}>
              {tab === "suggested" && <><h1 className="page-h">Suggested for you</h1><Suggested tasks={board} profile={profile} applied={applied} onApply={onApply} scores={scores} goProfile={() => setTab("profile")} onQuiz={() => setScreen("quiz")} /></>}
              {tab === "all" && <><h1 className="page-h">All available <span className="page-sub">{board.length} tasks</span></h1><AllAvailable tasks={board} profile={profile} applied={applied} onApply={onApply} scores={scores} /></>}
              {tab === "working" && <><h1 className="page-h">Working on</h1><WorkingOn tasks={board} applied={applied} jobStatus={jobStatus} onAdvance={advance} /></>}
              {tab === "applied" && <><h1 className="page-h">Applied</h1><Applied tasks={board} applied={applied} profile={profile} jobStatus={jobStatus} scores={scores} /></>}
              {tab === "profile" && <ProfilePage profile={profile} onSave={applyProfile} onQuiz={() => setScreen("quiz")} aiKey={aiKey} model={model} />}
              {tab === "settings" && <SettingsPage profile={profile} />}
            </PageBoundary>
          </main>
        </>
      )}
    </div>
  );
}
