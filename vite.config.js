import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The McClaw API does not (yet) send permissive CORS headers, so a browser
// can't call https://mcclaw.io/api/v1 directly from localhost. In dev we route
// every /api request through Vite's proxy to mcclaw.io — the request leaves the
// dev server (not the browser), so CORS never applies.
//
// In production you'd put the same proxy in front of the static build (nginx,
// a Cloudflare Worker, a tiny Express server, etc.) OR have McClaw enable CORS.
// See README.md → "Deploying".
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "https://mcclaw.io",
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
