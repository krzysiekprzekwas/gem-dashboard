# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

GEM Dashboard — a Global Equity Momentum investment-strategy tracker. Next.js 16 (App Router, React 19) frontend + FastAPI/SQLModel backend, deployed on Vercel.

## Commands

```bash
# Frontend
npm run dev            # Next.js dev server on :3000 (proxies /api/* to :8000, see next.config.ts)
npm run build          # Production build
npm run lint           # ESLint

# Backend (run alongside `npm run dev` locally)
cd backend && python main.py    # uvicorn on :8000 with reload
# or: uvicorn main:app --host 0.0.0.0 --port 8000
```

No test suite exists. Backend deps: `backend/requirements.txt`. Python venv is in `venv/`.

## Architecture

**Two apps, one repo.** In local dev the Next.js server (`next.config.ts` rewrites) proxies `/api/*` to the FastAPI server on `127.0.0.1:8000`. On Vercel, `vercel.json` rewrites `/api/*` to `api/index.py`, which imports `backend.main:app` as a serverless function. Both must expose the same routes.

**Backend imports are dual-mode.** Every backend module does `try: from .module import ... except ImportError: from module import ...` to work both as a package (Vercel) and standalone (`python main.py`). Preserve this pattern when adding modules.

### Data flow
1. `backend/momentum.py` — `fetch_momentum_data(region)` pulls 5y of daily prices from the Yahoo Finance Chart API (in-memory TTL cache, `CACHE_DURATION_MINUTES`), computes 12-month momentum (252 trading days), and derives the allocation **signal** (dual momentum: pick the stronger equity if either beats the threshold asset, else the bond).
2. `backend/main.py` — FastAPI endpoints: `/api/momentum`, `/api/history`, `/api/allocation-changes`, `/api/cron-update`. Serves live signals and reads/writes history.
3. `backend/database.py` — SQLModel `MomentumHistory` table. `get_latest_signal_change()` walks history to compute when the signal last flipped.
4. `lib/api.ts` — typed fetchers + SWR hooks (`useMomentumData`, `useHistoryData`, `useAllocationChanges`), 60s refresh. `API_BASE` = `NEXT_PUBLIC_API_URL || '/api'`.
5. `app/page.tsx` — dashboard, composing `components/` (allocation-changes, history-chart, history-table).

### Two gotchas that bite

- **Region ↔ fixed DB columns.** `REGION_CONFIGS` in `momentum.py` defines per-region tickers (US: SPY/VEU/BND/^IRX; EU: UCITS equivalents). But the DB schema and `lib/api.ts` types use **fixed** column names (`spy_mom`, `veu_mom`, `bnd_mom`, `tbill_mom`). The cron mapping in `update_momentum_history()` maps Equity1→spy, Equity2→veu, Bond→bnd, Threshold→tbill regardless of actual ticker. Adding a region means adding to `REGION_CONFIGS` + `regionLabels` in `app/page.tsx` — not new columns.
- **Cron auth.** `/api/cron-update` (Vercel cron, `0 12 * * 1-5`) requires `Authorization: Bearer $CRON_SECRET`. It updates history for all regions.

### i18n
`next-intl` with locale from the `NEXT_LOCALE` cookie (default `en`), messages in `messages/{en,pl}.json`, config in `i18n/request.ts`. `middleware.ts` is a pass-through.

## Conventions

- `components/ui/` are shadcn/Radix primitives — don't edit them directly.
- TailwindCSS v4 utility classes + theme CSS vars (`text-foreground`, `bg-background`); dark mode via `next-themes`. No inline styles. Use `cn()` from `lib/utils`.
- Client components need `"use client"`. `@/` path alias → repo root.

For deeper style/convention detail see `Agents.md`.
