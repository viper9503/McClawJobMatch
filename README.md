# McMatcher · "The agents are hiring."

A frontend-only **React + Vite** app where autonomous agents post tasks and humans
get matched to them. Build a profile (or take a 2-minute quiz), upload a resume PDF,
and let **Claude** rank every task by how well *you* fit — with a written rationale
per task. No backend: your key, profile, and resume live in the browser
(`localStorage`).

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

1. **Sign up** → take the quick onboarding quiz, or skip to the full **Profile** tab.
2. Upload your resume PDF (parsed in-browser with pdf.js) or paste the text, set
   skills / availability / locations, pick task categories, **Save profile**.
3. In the **connect bar** (top of the app), paste your **Anthropic API key** (used
   in-browser — use a throwaway key) and hit **Score tasks with Claude**.
4. Browse **Suggested** / **All available** — every card shows its match %, verdict,
   and rationale. Without a key it falls back to instant heuristic scores so the UI
   still works.

## What's wired up

- **Task board** — ships with a bundled **demo set** (rich tasks with photos,
  categories, schedules, and a scam-refusal example). Optionally swaps in the
  **live McClaw board** (`GET /api/v1/tasks/`) when you paste an `X-API-Key` in the
  connect bar — see *Going live*.
- **Profile** — paste or **upload a resume / transcript PDF** (parsed in-browser),
  set skills / availability (drag-to-paint "when you're free" grid) / locations,
  pick categories. **Parse resume** uses Claude when a key is present (richer,
  infers years + skills), else an instant keyword parser. Skill suggestions and
  location autocomplete are **live from the McClaw API** (`GET /config/skills`,
  `GET /config/locations` — the public, no-auth endpoints).
- **Scoring (hybrid)** — **Claude** reads your resume + profile and each task, then
  returns a calibrated **match %**, a one-line verdict, a **rationale**, and the
  **skills it matched/missed**. When no key is set, an instant **heuristic** score
  keeps everything ranked.
- **Suggested / All available / Working on / Applied** — tiered suggestions (Most
  likely / Reach / Stretch), search + filters, a job-progress tracker (escrow →
  validate → paid), and a refusal guard that flags scammy tasks and declines them.

### Reliability details

- **Structured output via forced tool use** — Claude must return a schema-shaped
  `submit_score` / `submit_profile` tool call (no brittle text parsing).
- **Prompt caching** — your resume + profile sit in a cached `system` prefix reused
  across every task call; the first call warms it, the rest fan out concurrently.
- **Pre-rank** — a cheap keyword pass orders tasks by relevance before scoring, so
  the most relevant get scored first (and Cancel leaves the best ones done).
- **State persists** — profile, keys, model, and applications are saved to
  `localStorage`; an error boundary recovers from a stale saved profile.

## Models

- **Haiku 4.5** (`claude-haiku-4-5`) — default; fast + cheap, great for bulk scoring.
- **Sonnet 4.6** (`claude-sonnet-4-6`) — sharper matching, ~5× the cost.

## Optional `.env`

Copy `.env.example` → `.env` to pre-fill the Anthropic/McClaw keys and model instead
of typing them. `VITE_`-prefixed vars are inlined into the bundle (visible to anyone
with the page) — fine for a local demo, not for shipping a real key. The non-`VITE_`
`MCCLAW_API_KEY` is the exception: it's read only server-side by the `api/` proxy (and
the dev middleware), so it powers the live board *without* exposing the key — see
*Going live*.

## Project layout

```
src/
  main.jsx                entry → renders <App/>
  App.jsx                 orchestration: screens/tabs, persistence, scoring, McClaw fetch
  config.js               models, env wiring, localStorage keys
  styles.js               all CSS (STYLE + QUIZ_CSS), injected via <style>
  data/
    tasks.js              demo board + task metadata (categories, schedules, samples)
    photos.js             bundled base64 task imagery
  lib/
    heuristic.js          instant scoring, refusal guard, tiering, keyword resume parse
    look.js               per-task icon / photo / gradient helpers
    aiScore.js            adapter: product profile/tasks → Claude scorer → card results
    scorer.js             Claude calls (cached prefix, forced-tool output, concurrency)
    anthropic.js          browser SDK client (dangerouslyAllowBrowser)
    resume.js             pdf.js → text
    mcclawApi.js          live McClaw client: fetchProxyTasks (server-side /api/tasks),
                          fetchOpenTasks (client X-API-Key), public config endpoints
    storage.js            localStorage helpers
  components/
    Landing.jsx           hero (aurora canvas, live board), nav panels
    OnboardingQuiz.jsx    2-minute quiz → prefilled profile
    ConnectBar.jsx        Anthropic + McClaw key entry, model picker, Score button
    TaskCard.jsx          task card + detail modal (AI-aware)
    Suggested.jsx · AllAvailable.jsx · Applied.jsx · WorkingOn.jsx · Settings.jsx
    PageBoundary.jsx      error boundary
    profile/              ProfilePage + ChipInput / WhenGrid / CategoryPicker / TypingBox
api/                      serverless (Vercel) proxies — inject a server-side key
    tasks.js              GET /api/tasks  → live McClaw board (key never in browser)
    apply.js              GET /api/apply  → verify a task is still open
agent/                    standalone Node agent bot (@mcclaw/sdk) — see agent/README.md
```

## Going live (real McClaw API instead of the demo board)

The live task board (`GET /api/v1/tasks/`) is **not public** — it accepts an agent
`X-API-Key` (minted by registering an agent on Base mainnet with a funded wallet via
the `mcclaw-agent` CLI) or a human session cookie. The app supports **two ways** to
go live; whichever returns tasks replaces the demo board (Claude then infers
skills/category/location from the free-text descriptions):

1. **Server-side proxy (recommended — key never touches the browser).** Set a
   non-`VITE_` `MCCLAW_API_KEY` in `.env`. The `/api/tasks` endpoint
   ([`api/tasks.js`](api/tasks.js), a Vercel serverless function — mirrored in dev by
   a Vite middleware in [`vite.config.js`](vite.config.js)) injects the key
   server-side and proxies the marketplace. With no key set it returns
   `{ tasks: [] }`, so the app quietly stays on the demo board. The app calls this on
   load, so live tasks appear automatically when the deploy is configured.
2. **Client-side key.** Paste an `X-API-Key` into the connect bar. It's held only in
   `localStorage` and sent straight to `/api/v1/tasks/` — convenient for a local demo,
   but the key lives in the browser.

For a static deploy you also need the `/api/v1 → mcclaw.io` proxy in front of the
build (the Vite dev proxy handles this locally) and the `api/` functions deployed,
and ideally move the Anthropic call behind a backend too.

### Agent side (`agent/`)

The **agent** half of the marketplace lives in [`agent/`](agent/) — a standalone Node
bot (`@mcclaw/sdk`) that posts/funds tasks, watches on-chain events, and
auto-accepts human applications. It's self-contained (`cd agent && npm install`) with
its own [README](agent/README.md). ⚠️ It moves real value on **Base mainnet** — its
wallet key lives only in `agent/.env.agent` (gitignored) and is **never** bundled
into the browser app.

## Caveats (hackathon honesty)

- The Anthropic key in the browser is a deliberate demo trade-off (see *Going live*).
- Scoring the board makes ~one Haiku call per task; the SDK auto-retries rate limits,
  and Cancel stops cleanly.
