# Cleanleaf Development Guidelines & gstack Workflow

## Architecture & Production Target
- **Render Web Service (`cleanleafsatelites`)**: Production target running single-process Express server (`dist/index.js`) listening on `0.0.0.0:${PORT}` (`10000`).
- **Database & Auth**: Supabase Postgres with Row Level Security (RLS) policies enforced via `tenant_id` from JWT `app_metadata`.
- **API Interfaces**: Express REST API v1 (`/api/v1`) and tRPC v11 (`/api/trpc`) endpoints.

## Core Verification Commands
- `pnpm check`: Runs `tsc --noEmit` to verify type completeness across server, shared, and client modules.
- `pnpm test`: Runs Vitest test suite (`server/` unit and integration tests).
- `pnpm build`: Bundles frontend assets (`vite build`) and server entrypoint (`esbuild server/_core/index.ts`).
- `pnpm audit --prod`: Checks for production package vulnerabilities.

---

## gstack Methodology & Workflow Integration

This repository implements [gstack](https://github.com/garrytan/gstack) (Garry Tan's AI sprint process):

```
Think → Plan → Build → Review → Test → Ship → Reflect
```

### Key gstack Commands
- `/office-hours`: Product framing & architectural design doc generation.
- `/plan-eng-review`: System architecture, multi-tenant boundaries, and test plan lock-in.
- `/review`: Staff engineer level code review catching production bugs, complexity, and gate integrity.
- `/cso`: Application security audit (OWASP Top 10, JWT, RLS policies, CORS, rate limits).
- `/qa-only` / `/qa`: Replayable evidence exploration, test creation, and bug verification.
- `/ship`: Release pipeline verification (`pnpm check && pnpm test && pnpm build`), doc sync, and PR creation.

### Local Installation for Team Members
```bash
git clone --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
cd ~/.claude/skills/gstack && ./setup --team
```
