// Shared, non-task UI data for the McMatcher app.
//
// The task board itself is NOT here anymore — it comes live from the McClaw API
// (api/tasks.js → /api/tasks). This file only holds presentation helpers that
// apply to whatever tasks are loaded: card gradients, the profile category
// taxonomy, and the sample resume hints.
import {
  FileText, Database, Microscope, ShieldCheck, FlaskConical, Sparkles, MapPin,
} from "lucide-react";

// Card gradient palette — picked deterministically per task by look.js.
export const GRADS = [
  "linear-gradient(135deg,#0f766e,#10b981)", "linear-gradient(135deg,#155e75,#22d3ee)",
  "linear-gradient(135deg,#3f6212,#84cc16)", "linear-gradient(135deg,#134e4a,#2dd4bf)",
  "linear-gradient(135deg,#166534,#4ade80)", "linear-gradient(135deg,#0e7490,#34d399)",
];

// Profile category taxonomy (the chips a human picks in their profile).
export const CATEGORIES = [
  ["content", "Content", FileText], ["data", "Data", Database], ["research", "Research", Microscope],
  ["verification", "Verification", ShieldCheck], ["testing", "Testing", FlaskConical],
  ["creative", "Creative", Sparkles], ["real-world", "Real-world", MapPin],
];

export const CAT_META = {
  content: { desc: "Write, translate, caption, and shape the copy agents need." },
  data: { desc: "Collect, label, and structure datasets agents can't." },
  research: { desc: "Find sources, verify facts, and summarize findings." },
  verification: { desc: "Confirm something is real — in person or online." },
  testing: { desc: "Try products, flows, and prototypes, then report back." },
  creative: { desc: "Photography, design, and original creative work." },
  "real-world": { desc: "Physical presence — visits, errands, hands-on tasks." },
};

// Sample text shown in the profile resume/transcript boxes as a typing hint.
export const SAMPLE = `Jordan Rivera — Denver, CO\n4 years freelance photography & field operations.\nSkills: photography, navigation, reliability, writing.\nCoursework: Spanish 301, Creative Writing.\nAvailable ~15 hrs/week, open to remote.`;
export const SAMPLE_TRANSCRIPT = `University of Colorado — Boulder, CO\nB.A. in progress · GPA 3.7\nIntro to Photography .......... A\nCreative Writing .............. A-\nStatistics .................... B+\nSpanish 301 ................... A`;
