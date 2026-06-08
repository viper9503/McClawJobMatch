import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// The McClaw API does not (yet) send permissive CORS headers, so a browser can't
// call https://mcclaw.io/api/v1 directly from localhost. Two pieces handle that:
//
//   1. /api/v1 proxy  — forwards the frontend's direct McClaw calls (the app's
//      MCCLAW_API_BASE is "/api/v1") to mcclaw.io. The request leaves the dev
//      server (not the browser), so CORS never applies. This is what the
//      client-side X-API-Key / public-config-endpoint calls use.
//
//   2. /api/tasks + /api/apply middleware — mirrors the production Vercel
//      serverless functions in `api/`. They inject a SERVER-SIDE MCCLAW_API_KEY
//      (NOT a VITE_ var, so it never reaches the browser bundle) and proxy the
//      McClaw marketplace. This is the more secure "going live" path.
//
// In production you'd put the same /api/v1 proxy in front of the static build
// (nginx, a Cloudflare Worker, a tiny Express server, etc.) and deploy `api/` as
// serverless functions. See README.md → "Going live".
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const KEY = env.MCCLAW_API_KEY || "";
  const BASE = env.MCCLAW_API_URL || "https://mcclaw.io/api/v1";

  const liveTasksDev = {
    name: "mcclaw-live-tasks-dev",
    configureServer(server) {
      server.middlewares.use("/api/tasks", async (_req, res) => {
        res.setHeader("Content-Type", "application/json");
        if (!KEY) {
          res.end(JSON.stringify({ tasks: [] }));
          return;
        }
        try {
          const r = await fetch(`${BASE}/tasks/?status=new&page_size=50`, {
            headers: { Accept: "application/json", "X-API-Key": KEY },
          });
          res.statusCode = r.status;
          res.end(await r.text());
        } catch (e) {
          res.statusCode = 502;
          res.end(JSON.stringify({ error: String(e && e.message ? e.message : e) }));
        }
      });
      // Mirror /api/apply: verify a task is still open before handing off.
      server.middlewares.use("/api/apply", async (req, res) => {
        res.setHeader("Content-Type", "application/json");
        const id = new URL(req.url, "http://localhost").searchParams.get("id");
        if (!id) { res.statusCode = 400; res.end(JSON.stringify({ error: "missing id" })); return; }
        if (!KEY) { res.end(JSON.stringify({ available: false, reason: "no-key" })); return; }
        try {
          const r = await fetch(`${BASE}/tasks/${id}/`, { headers: { Accept: "application/json", "X-API-Key": KEY } });
          if (!r.ok) { res.end(JSON.stringify({ available: false, reason: "fetch-" + r.status })); return; }
          const t = await r.json();
          const status = String(t.status || "");
          res.end(JSON.stringify({ available: /new|funded/i.test(status), status, title: t.title }));
        } catch (e) {
          res.statusCode = 502;
          res.end(JSON.stringify({ available: false, error: String(e && e.message ? e.message : e) }));
        }
      });
    },
  };

  return {
    plugins: [react(), liveTasksDev],
    server: {
      proxy: {
        "/api/v1": { target: "https://mcclaw.io", changeOrigin: true, secure: true },
      },
    },
  };
});
