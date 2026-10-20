import { readdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import { execFileSync } from "node:child_process";
import environment from "./src/data/environment.json" with { type: "json" };
export default defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      input: [
        "index.html",
        "works/index.html",
        "philosophy/index.html",
        "about/index.html",
        "journal/index.html",
        "contact/index.html",
        "404.html",
        ...readdirSync("journal", { withFileTypes: true })
          .filter(
            (d) =>
              d.isDirectory() && existsSync(`journal/${d.name}/index.html`),
          )
          .map((d) => `journal/${d.name}/index.html`),
      ].map((p) => resolve(p)),
    },
    target: "es2022",
    assetsDir: "assets",
    chunkSizeWarningLimit: 600,
  },
  server: { strictPort: true },
  plugins: [
    {
      name: "local-motion-version",
      configureServer(server) {
        server.middlewares.use("/__motion-version", (_req, res) => {
          const git = (...args: string[]) => {
            try {
              return execFileSync("git", args, {
                cwd: server.config.root,
                encoding: "utf8",
              }).trim();
            } catch {
              return "unavailable";
            }
          };
          res.setHeader("Cache-Control", "no-store");
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(
            JSON.stringify({
              head: git("rev-parse", "--short", "HEAD"),
              branch: git("branch", "--show-current"),
              dirty: !!git("status", "--porcelain"),
              root: server.config.root,
              mode: "development",
              motionRevision: environment.revision,
            }),
          );
        });
      },
    },
  ],
});
