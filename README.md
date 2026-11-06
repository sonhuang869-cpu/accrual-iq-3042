# AccrualIQ — Revenue Recognition & ASC 606 Compliance Platform

Enterprise-grade revenue recognition management platform built for finance and revenue assurance teams operating under ASC 606 / IFRS 15 frameworks.

## Product Overview

AccrualIQ provides end-to-end management of contract revenue recognition:

- **Contract Portfolio Management** — sortable/filterable contract list with status tracking, TCV, and recognition progress
- **Performance Obligations Engine** — SSP-ratio allocation calculator with mathematical precision; variable consideration and modification handling
- **Recognition Schedule** — 24-month portfolio waterfall, deferred revenue rollforward, current-period journal entry generation
- **Compliance Dashboard** — Portfolio KPIs, ASC 606 five-step checklist per contract, attention queue
- **Audit Trail** — Timestamped, categorized log of all allocation changes, recognition events, and modifications

## Stack

- Vite + React 18 + TypeScript
- Tailwind CSS (dark enterprise theme)
- React Router v6
- Recharts (data visualizations)
- date-fns, Lucide React, Sonner

## Seed Data

12 realistic SaaS/professional services contracts:

| Customer | Contracts | TCV Range |
|---|---|---|
| Meridian Healthcare Systems | 2 (1 modified) | $380K – $1.25M |
| Apex Manufacturing Ltd | 2 (1 modified) | $520K – $680K |
| Cascade Financial Group | 2 (1 modified) | $1.1M – $2.4M |
| TerraLogic Inc | 2 | $175K – $425K |
| Sterling Capital Partners | 2 (1 draft) | $285K – $1.85M |
| NovaBridge Corp | 2 | $950K – $1.65M |

All allocations are mathematically correct: `allocated_i = (SSP_i / Σ SSP) × TCV`, summing precisely to TCV.

## Local Development

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
npm run preview
```

## Routes

| Route | Description |
|---|---|
| `/dashboard` | Compliance Dashboard with KPIs, waterfall chart, checklist |
| `/contracts` | Contract list — sortable, filterable |
| `/contracts/:id` | Contract detail — POs, allocation table, schedule, journal entries |
| `/recognition` | Recognition Schedule — 24-month waterfall, rollforward, current period |
| `/audit` | Audit Trail — timestamped event log |

## Assumptions & Limitations

- **Frontend-only demo**: No backend. All data persists in localStorage. Changes survive page refresh.
- **Reset**: Clear browser localStorage for `accrualiq_contracts_v1` to restore seed data.
- **Current date**: Hardcoded to `2026-11-06` to demonstrate a mature portfolio with meaningful recognition history.
- **ARR calculation**: Annualized from TCV/term for active and modified contracts (simplified vs. true ARR with expansion tracking).
- **Deferred rollforward additions**: Simplified to track PointInTime PO deliveries as billing additions; a production system would integrate with a billing ledger.

## Deployment (Vercel)

Client-side routing rewrites are configured in `vercel.json`. Deploy directly with the Vercel CLI or connect the GitHub repository to Vercel for automatic deployments.
