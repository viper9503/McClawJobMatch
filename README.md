# McClaw · Human Terminal — AI Job Matcher

"The agents are hiring." A frontend-only React + Vite app: it loads the McClaw task
board, lets you build a profile (upload a resume PDF), and uses **Claude** to rank
every task by how well *you* fit it — with a written rationale per task. No backend:
your key, profile, and resume live in the browser (`localStorage`).

## What's wired up

- **Task board** — ships with the bundled **mock dataset** (`mcclaw_task_template.csv`,
  100 real-format McClaw tasks: email review, labeling, captioning, OCR checks…).
  Parsed at build time. (A live `GET /api/v1/tasks/` client also exists in
  `src/lib/mcclawApi.js` for when you have a McClaw key — see *Going live*.)
- **Profile** — paste or **upload a resume PDF** (parsed in-browser with pdf.js),
  set skills / availability / locations, pick task categories. Skill suggestions and
  location autocomplete are **live from the McClaw API** (`GET /config/skills`,
  `GET /config/locations` — the only public, no-auth McClaw endpoints).
- **Scoring (hybrid)** — the real McClaw tasks are free-text with no structured
  requirements, so **Claude** reads your resume + profile and each task, then returns
  a calibrated **match %**, a one-line verdict, a **rationale**, and the **skills it
  matched/missed**. When no API key is set, an instant **heuristic** score is used so
  the UI still works.
- **Suggested / All available / Applied** — tiered suggestions (Most likely / Reach /
  Stretch), filters, and a refusal guard that flags scammy tasks (credential
  phishing, impersonation) and declines them.

### Reliability details

- **Structured output via forced tool use** — Claude must return a schema-shaped
  `submit_score` tool call (no brittle text parsing).
- **Prompt caching** — your resume + profile sit in a cached `system` prefix reused
  across every task call; the first call warms it, the rest fan out concurrently.
- **Pre-rank** — a cheap keyword pass orders tasks by relevance before scoring, so the
  most relevant get scored first (and Cancel leaves the best ones done).

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

1. **Sign up** → land on the **Profile** tab. Upload your resume PDF (or keep the
   sample text), tweak skills/availability, **Save profile**.
2. In the green **match bar**, paste your **Anthropic API key** (used in-browser — use
   a throwaway key), pick a model, and hit **Score tasks with Claude**.
3. Browse **Suggested** / **All available** — every card shows its Claude match %,
   verdict, and rationale. Without a key it falls back to heuristic scores.

## Models

- **Haiku 4.5** (`claude-haiku-4-5`) — default; fast + cheap, great for bulk scoring.
- **Sonnet 4.6** (`claude-sonnet-4-6`) — sharper matching, ~5× the cost.

## Optional `.env`

Copy `.env.example` → `.env` to pre-fill the Anthropic key / model instead of typing
them. `VITE_`-prefixed vars are inlined into the bundle (visible to anyone with the
page) — fine for a local demo, not for shipping a real key.

## Project layout

```
src/
  McClawProduct.jsx     the product UI (landing, tabs, cards, profile, match bar)
  config.js             models, env wiring, localStorage keys
  data/mcclaw_task_template.csv   bundled mock dataset
  lib/
    mockTasks.js        CSV → task board (parsed at build via ?raw)
    aiScore.js          adapter: product profile/tasks → Claude scorer → card results
    scorer.js           Claude calls (cached prefix, forced-tool output, concurrency)
    anthropic.js        browser SDK client (dangerouslyAllowBrowser)
    resume.js           pdf.js → text
    storage.js          localStorage helpers
    mcclawApi.js        live GET /tasks/ client (for real-API mode)
```

## Going live (real McClaw API instead of the mock CSV)

The live task board (`GET /api/v1/tasks/`) is **not public** — probing it returns
`401 missing authentication`. It accepts either:

- an **agent `X-API-Key`** — but that returns the *agent's own posted tasks*, not the
  marketplace, and minting one requires registering an agent on **Base mainnet** with a
  funded wallet (`MCCLAW_PRIVATE_KEY` + MCLAW + ETH for gas) via the `mcclaw-agent` CLI
  (`github.com/mcclawio/sdk-ts`). Wrong side of the marketplace for a human-browse app.
- a **human session cookie** — what the website uses after wallet (SIWE) login. This is
  the data the `mcclaw_task_template.csv` was exported from.

To wire the real board: log into mcclaw.io, grab your session cookie, and forward it on
`GET /api/v1/tasks/` (e.g. inject it as a header in the Vite proxy, or run a tiny
backend that holds it). `src/lib/mcclawApi.js` already has `fetchOpenTasks()` for the
request itself — swap the board source in `McClawProduct.jsx` from `MOCK_TASKS` to the
fetched + normalized tasks. For a static deploy you also need the `/api → mcclaw.io`
proxy in front of the build, and ideally move the Anthropic call behind a backend.

## Caveats (hackathon honesty)

- The Anthropic key in the browser is a deliberate demo trade-off (see *Going live*).
- Scoring all 100 tasks makes ~100 Haiku calls; the SDK auto-retries rate limits, and
  Cancel stops cleanly. Lower the count by pre-ranking + slicing in `aiScore.js` if you
  want fewer calls.
