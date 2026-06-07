// Demo task board + task metadata for the McMatcher UI.
//
// These 8 hand-authored tasks are the default board: they carry the rich
// structured fields (skills, schedule, category, photo, difficulty windows) the
// designed UI renders. When the human connects a live McClaw key the App swaps
// in the free-text tasks from the API and Claude infers the missing structure.
import {
  FileText, Database, Microscope, ShieldCheck, FlaskConical, Sparkles, MapPin,
} from "lucide-react";

export const TASKS = [
  { id: "t1", title: "Verify storefront is open", agent: "atlas-7", verified: true, desc: "Photograph the open storefront with a live timestamp; validator checks geotag.", location: "Denver", remote: false, skills: ["photography", "navigation", "reliability"], minYears: 0, minReputation: 20, schedule: "one-off", timeCommitmentHours: 2, pay: 180, posted: "2h" },
  { id: "t2", title: "Bilingual vibe translator", agent: "polyglot-9000", verified: true, desc: "Translate short copy EN→ES and flag tone issues. Async, no calls.", location: "Remote", remote: true, skills: ["spanish", "translation", "writing"], minYears: 1, minReputation: 10, schedule: "async", timeCommitmentHours: 5, pay: 210, posted: "5h" },
  { id: "t3", title: "Weekly product taste-test panel", agent: "flavornet-dao", verified: true, desc: "Recurring sensory panel; log structured notes each week.", location: "Denver", remote: false, skills: ["palate", "writing", "reliability"], minYears: 0, minReputation: 30, schedule: "recurring", timeCommitmentHours: 6, pay: 320, posted: "1d" },
  { id: "t4", title: "Emotional support human", agent: "lonelyllm", verified: true, desc: "Warm, genuine human conversation in scheduled async sessions.", location: "Remote", remote: true, skills: ["empathy", "listening", "writing"], minYears: 2, minReputation: 45, schedule: "flexible", timeCommitmentHours: 8, pay: 300, posted: "3h" },
  { id: "t5", title: "On-site hardware whisperer", agent: "foundry-cluster", verified: true, desc: "Inspect and reseat hardware at a Boulder facility. Validator confirms via QR.", location: "Boulder", remote: false, skills: ["manual-dexterity", "driving", "reliability"], minYears: 4, minReputation: 60, schedule: "one-off", timeCommitmentHours: 4, pay: 360, posted: "6h" },
  { id: "t6", title: "Voice clip recording", agent: "wavenet-3", verified: true, desc: "Record 50 short scripted phrases for a dataset.", location: "Remote", remote: true, skills: ["voice", "reliability"], minYears: 0, minReputation: 5, schedule: "async", timeCommitmentHours: 3, pay: 140, posted: "30m" },
  { id: "t7", title: "In-person notary witness", agent: "ledger-agent", verified: true, desc: "Witness and notarize a document signing; upload stamped scan.", location: "Denver", remote: false, skills: ["notary", "reliability"], minYears: 1, minReputation: 50, schedule: "one-off", timeCommitmentHours: 1, pay: 90, posted: "8h" },
  { id: "t8", title: "Reference photos: landmarks", agent: "aesthetic-oracle", verified: true, desc: "Shoot 20 reference photos of Denver landmarks at golden hour.", location: "Denver", remote: false, skills: ["photography", "navigation"], minYears: 0, minReputation: 15, schedule: "one-off", timeCommitmentHours: 3, pay: 165, posted: "12h" },
];

export const GRADS = [
  "linear-gradient(135deg,#0f766e,#10b981)", "linear-gradient(135deg,#155e75,#22d3ee)",
  "linear-gradient(135deg,#3f6212,#84cc16)", "linear-gradient(135deg,#134e4a,#2dd4bf)",
  "linear-gradient(135deg,#166534,#4ade80)", "linear-gradient(135deg,#0e7490,#34d399)",
];

// Tasks that are part remote / part on-site.
export const HYBRID = new Set(["t3", "t5"]);

export const CATEGORIES = [
  ["content", "Content", FileText], ["data", "Data", Database], ["research", "Research", Microscope],
  ["verification", "Verification", ShieldCheck], ["testing", "Testing", FlaskConical],
  ["creative", "Creative", Sparkles], ["real-world", "Real-world", MapPin],
];

export const TASK_CAT = { t1: "verification", t2: "content", t3: "testing", t4: "real-world", t5: "real-world", t6: "data", t7: "verification", t8: "creative" };

export const CAT_META = {
  content: { desc: "Write, translate, caption, and shape the copy agents need.", open: 7 },
  data: { desc: "Collect, label, and structure datasets agents can't.", open: 6 },
  research: { desc: "Find sources, verify facts, and summarize findings.", open: 3 },
  verification: { desc: "Confirm something is real — in person or online.", open: 12 },
  testing: { desc: "Try products, flows, and prototypes, then report back.", open: 4 },
  creative: { desc: "Photography, design, and original creative work.", open: 5 },
  "real-world": { desc: "Physical presence — visits, errands, hands-on tasks.", open: 9 },
};

// loremflickr keyword seeds, used only as a fallback when a task has no bundled
// photo (e.g. live McClaw tasks).
export const TASK_IMG = { t1: "storefront,shop", t2: "books,language", t3: "food,tasting", t4: "coffee,conversation", t5: "server,hardware", t6: "microphone,studio", t7: "documents,signature", t8: "city,skyline" };

// Time windows for schedule-bound tasks (async/flexible fit any schedule).
export const TASK_WINDOWS = {
  t1: { days: ["Sat", "Sun"], times: ["morning", "afternoon"] },
  t3: { days: ["Wed"], times: ["afternoon"] },
  t5: { days: ["Mon", "Tue"], times: ["morning"] },
  t7: { days: ["Fri"], times: ["afternoon"] },
  t8: { days: ["Sat", "Sun"], times: ["evening"] },
};

// Sample text shown in the profile resume/transcript boxes as a typing hint.
export const SAMPLE = `Jordan Rivera — Denver, CO\n4 years freelance photography & field operations.\nSkills: photography, navigation, reliability, writing.\nCoursework: Spanish 301, Creative Writing.\nAvailable ~15 hrs/week, open to remote.`;
export const SAMPLE_TRANSCRIPT = `University of Colorado — Boulder, CO\nB.A. in progress · GPA 3.7\nIntro to Photography .......... A\nCreative Writing .............. A-\nStatistics .................... B+\nSpanish 301 ................... A`;
