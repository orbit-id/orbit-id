# Orbit ID Playground

Local web UI for encode / decode / generate ([#20](https://github.com/orbit-id/orbit-id/issues/20)).

Supports **Orbit ID v1** (default) and **v2 Draft** via a Format selector ([#145](https://github.com/orbit-id/orbit-id/issues/145)).
UI strings support **English (default)** and Japanese; language and format choice are stored in `localStorage`.

## Local

```bash
npm ci
npm run build -w @orbit-id/core
npm run playground
```

Open the Vite URL (default `http://localhost:5173`).

## GitHub Pages

On pushes to `main` that touch the playground (or via **workflow_dispatch**),
[`.github/workflows/pages.yml`](../../.github/workflows/pages.yml) runs:

1. `vite build` (`GITHUB_PAGES=true` → `base: /orbit-id/`)
2. `actions/upload-pages-artifact`
3. `actions/deploy-pages`

Published at: https://orbit-id.github.io/orbit-id/

Repo Settings → Pages → Source must be **GitHub Actions**.
