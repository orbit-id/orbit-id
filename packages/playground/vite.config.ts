import { defineConfig } from "vite";

const pages = process.env.GITHUB_PAGES === "true";

export default defineConfig({
  // Project Pages URL: https://orbit-id.github.io/orbit-id/
  base: pages ? "/orbit-id/" : "/",
  root: ".",
  server: { port: 5173 },
  build: { outDir: "dist-web", emptyOutDir: true },
});
