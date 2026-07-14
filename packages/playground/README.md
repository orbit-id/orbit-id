# Orbit ID Playground

Local web UI for encode / decode / generate ([#20](https://github.com/ponstream24/orbit-id/issues/20)).

Visual language is inspired by [Web ToolBox](https://web-toolbox.dev/) (dark tool page, indigo accent, compact cards).
UI strings support **English (default)** and Japanese; choice is stored in `localStorage`.

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

Published at: https://ponstream24.github.io/orbit-id/

Repo Settings → Pages → Source must be **GitHub Actions**.
