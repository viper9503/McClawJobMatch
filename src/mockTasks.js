// Mock dataset loader: parses the real McClaw task export (mcclaw_task_template.csv)
// into the task shape the product UI uses. Bundled at build time via Vite's ?raw.
//
// CSV columns: Task Title, Status, Task Description, Reward, Required Stake, Fee,
// Created, Posted By, Wallet, Warning, On-chain Task ID, ...tx columns...,
// Escrow Amount, Platform Fee (5%), Your Payout, Required Stake (Financials).
//
// These are digital micro-tasks (email review, labeling, captioning) with no
// structured skills/location/schedule — Claude infers those from the description
// at scoring time. We leave sensible defaults here so the heuristic fallback and
// the filters still behave.

import * as XLSX from "xlsx";
import csvText from "../data/mcclaw_task_template.csv?raw";

// Pull the first number out of strings like "25 MCLAW" / "23.75 MCLAW" / "N/A".
function num(v) {
  const m = String(v ?? "").match(/-?\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : 0;
}

export function loadMockTasks() {
  const wb = XLSX.read(csvText, { type: "string" });
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });

  return rows
    .map((r, i) => {
      const get = (k) => r[k] ?? "";
      const onchain = String(get("On-chain Task ID") || i + 1).trim();
      const reward = num(get("Reward")) || num(get("Escrow Amount"));
      const payout = num(get("Your Payout")) || reward;
      const title = String(get("Task Title")).trim();
      if (!title) return null;
      return {
        id: `task-${onchain || i + 1}`,
        title,
        agent: String(get("Posted By")).trim() || "McClaw",
        // Funded => escrow is locked on-chain => treat as a verified/safe poster.
        verified: /fund/i.test(get("Status")),
        desc: String(get("Task Description")).trim(),
        status: String(get("Status")).trim(),
        pay: reward, // gross reward in $MCLAW
        payout, // net to the human after platform fee
        stake: num(get("Required Stake")),
        fee: num(get("Fee")) || num(get("Platform Fee (5%)")),
        // Unknown for these digital tasks — Claude fills skills/category/remote in.
        skills: [],
        location: "Remote",
        remote: true,
        minYears: 0,
        minReputation: 0,
        schedule: "async",
        timeCommitmentHours: 1,
        source: "mock",
        raw: r,
      };
    })
    .filter(Boolean);
}

export const MOCK_TASKS = loadMockTasks();
