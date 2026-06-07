// Visual helpers shared across the board UI: deterministic gradient/icon/photo
// selection per task, plus a couple of text builders.
import {
  Camera, Languages, Mic, Stamp, Utensils, Database, ShieldCheck, Microscope,
  PenLine, MessageCircle, Wrench, Briefcase,
} from "lucide-react";
import { TASK_IMG, HYBRID } from "../data/tasks.js";
import { TASK_PHOTO } from "../data/photos.js";

// Stable string hash → used to pick a gradient/photo seed deterministically.
export function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Pick an icon from the task's skills / category / title+desc keywords, so the
// free-text live tasks don't all collapse to the same default icon. `m` is the
// (optional) score result, whose `category` the AI may have inferred.
export function iconFor(task, m) {
  const s = task.skills || [];
  const text = `${task.title} ${task.desc} ${(m && m.category) || ""}`.toLowerCase();
  const has = (...w) => w.some((x) => text.includes(x));
  if (s.includes("photography") || has("photo", "image", "camera", "golden hour")) return Camera;
  if (s.includes("spanish") || s.includes("translation") || has("translat", "bilingual", "language")) return Languages;
  if (s.includes("voice") || has("voice", "audio", "record", "transcri")) return Mic;
  if (s.includes("notary") || has("notar")) return Stamp;
  if (s.includes("palate") || has("taste", "flavor", "sensory")) return Utensils;
  if (has("label", "sort", "classif", "annotat", "ocr", "dataset", "tag ", "categor")) return Database;
  if (has("review", "score", "quality", "verify", "check", "accuracy", "flag")) return ShieldCheck;
  if (has("research", "summar", "compare")) return Microscope;
  if (has("email", "rewrite", "caption", "copy", "writing", "outreach", "message", "personaliz")) return PenLine;
  if (s.includes("empathy") || s.includes("listening") || has("support", "conversation", "chat")) return MessageCircle;
  if (s.includes("manual-dexterity") || s.includes("driving") || has("hardware", "on-site", "repair")) return Wrench;
  return Briefcase;
}

// Bundled base64 photo when we have one, else a seeded loremflickr image
// (used for live tasks that have no bundled art).
export function photoSrc(task, w, h) {
  return TASK_PHOTO[task.id] || `https://loremflickr.com/${w}/${h}/${TASK_IMG[task.id] || "abstract"}?lock=${hash(task.id)}`;
}

// remote | hybrid | onsite.
export const modeOf = (t) => (HYBRID.has(t.id) ? "hybrid" : t.remote ? "remote" : "onsite");

// One-paragraph "About this task" blurb for the task modal.
export function genAbout(t) {
  const where = t.remote ? "done remotely, from anywhere" : `on location in ${t.location}`;
  const sc = { "one-off": "a one-off task", recurring: "a recurring commitment", async: "async work you do on your own time", flexible: "flexible, on your own schedule" }[t.schedule] || t.schedule;
  const hrs = `${t.timeCommitmentHours} hour${t.timeCommitmentHours > 1 ? "s" : ""}`;
  return `It's ${sc}, ${where}, posted by ${t.agent}. Plan for roughly ${hrs} of work for ${t.pay} $MCLAW, released once your result is verified.`;
}
