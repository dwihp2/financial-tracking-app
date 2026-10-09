# Frontend — Financial Tracking

React 19 + Vite + TypeScript + Tailwind v4 + shadcn/ui.

See the [root README](../README.md) for the full picture, and
[CRUD-EXERCISE.md](../CRUD-EXERCISE.md) for the backend/CRUD tasks.

## Scripts

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # tsc -b && vite build
npm run lint      # oxlint
npm run preview   # serve the production build
```

## Layout

```
src/
├── components/
│   ├── ui/                     # shadcn/ui primitives (generated — avoid hand-editing)
│   ├── AddTransactionDialog.tsx  # CREATE — the worked CRUD reference
│   ├── FinancialSummary.tsx      # Money In / Money Out / Balance cards
│   ├── Filter.tsx                # month, direction, search, card, category
│   ├── ThemeToggle.tsx           # light/dark switch
│   └── TransactionTable.tsx      # deliberately a plain <table>
├── lib/
│   ├── api.ts                  # data-access seam: live API or seed fallback
│   ├── money.ts                # isMoneyIn / isMoneyOut / computeMoney / summarize
│   └── utils.ts                # cn() — re-exported from shadcn
├── types/index.ts              # Transaction, FilterState, Summary, DEFAULT_FILTERS
├── data/transactions.json      # offline seed (fallback when the API is down)
├── App.tsx                     # owns ALL app state and the global calculations
└── index.css                   # Tailwind v4 theme tokens (light + dark)
```

## Conventions

- **All app state lives in `App.tsx`** and flows down as props. No context, no
  global store. See `requirements.md` §3 for the two documented exceptions.
- Import UI primitives from `@/components/ui/...`, not from a package.
- Prefer semantic colour tokens (`bg-card`, `text-muted-foreground`,
  `text-income`, `text-expense`) over raw palette classes (`bg-slate-100`).
- `tsconfig.app.json` is strict: `noUnusedLocals`, `noUnusedParameters` and
  `verbatimModuleSyntax` (so type-only imports need `import type`).

## Adding a shadcn component

```bash
npx shadcn@latest add <component>
```

This project uses the `radix` base with the `nova` preset (lucide icons, Geist
font) — see `components.json`.
