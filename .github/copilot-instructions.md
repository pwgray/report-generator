## Project summary

- This is a small front-end **React + Vite + TypeScript** app (no backend) for building and previewing data reports. The app stores data in `localStorage` and uses the UI components under `components/`.
- Key service: `services/geminiService.ts` integrates with the Google GenAI client (`@google/genai`) to discover schemas and generate mock report data.

## How to run

- Install deps: `npm install` (Node.js required)
- Dev server: `npm run dev` (uses `vite`)
- Build: `npm run build`, Preview build: `npm run preview`

## Important patterns & conventions (actionable for an AI agent)

- Single-page front-end app (no server). Most state is in `App.tsx` and persisted via `localStorage` keys `dataSources` and `reports`.
- Mock auth: `App.tsx` defines `MOCK_USERS` — changes to auth or roles should consider the patterns there (switching by select control, role gating for admin features).
- Data model is declared in `types.ts`. Use these types (`TableDef`, `ColumnDef`, `ReportConfig`, etc.) when adding or updating logic to stay consistent.
- Table exposure: `TableDef.exposed` toggles whether a table appears in the report builder UI — enforce this when creating or filtering tables.
- IDs are generated with `crypto.randomUUID()` in multiple files — maintain this when creating new objects.

## AI integration specifics (critical)

- `services/geminiService.ts` is the primary integration point for the AI model. Important details:
  - Constant `GEMINI_MODEL = "gemini-2.5-flash"` (change here to swap models).
  - `generateReportData` builds a descriptive prompt and expects the model to return a JSON array of objects (it parses `response.text` as JSON)
  - `discoverSchema` enforces strict constraints in the prompt (EXACTLY 3 tables, MAX 5 columns, limited column types). The implementation expects valid JSON output and hydrates the returned schema with internal `id` fields.
  - `generateSchemaFromDescription` delegates to `discoverSchema('custom', ...)`.

## Environment & secrets (gotchas)

- The code reads the key using Vite-style runtime env: `import.meta.env.VITE_GEMINI_API_KEY` with a fallback to `process.env.API_KEY` in Node contexts (tests/CI). Important notes:
  - The `README.md` previously mentioned `GEMINI_API_KEY`; the project now standardizes on `VITE_GEMINI_API_KEY` for local dev `.env.local` files.
  - Vite exposes `import.meta.env.VITE_*` at runtime in the browser build. If you need server-side or secret handling, move calls to a backend or a secure serverless function instead of embedding secrets in client builds.
  - If no key is present, `services/geminiService.ts` logs an error and returns an empty result — some UI flows rely on this safe failure mode.

## Prompts & safety

- Prompts are intentionally constrained (low temperature, explicit JSON schema, `responseMimeType: "application/json"`) to reduce hallucinations. Follow these patterns when adding new prompts: keep temp low, prefer schema constraints, and validate/parses JSON safely.

## Files to inspect/edit for common tasks

- Add AI-related behavior: `services/geminiService.ts` (prompting patterns, model selection, schema parsing)
- Data model changes: `types.ts` and adjust UI components under `components/`
- UI and flows: `App.tsx`, `components/ReportBuilder.tsx`, `components/ReportViewer.tsx`, `components/DataSourceView.tsx`

## Tests & CI

- There are no test or CI scripts. If you add tests, follow the code's TypeScript + Vite setup and add appropriate `npm` scripts. Keep tests focused on small units: schema parsing, prompt construction, and local-storage migrations (see migration logic in `App.tsx`).

## Helpful examples to copy from this repo

- Prompt constraining and schema hydration: `services/geminiService.ts` → `discoverSchema`
- Local-storage migration and permission checks: `App.tsx` (migration in `useState` and permission checks in `handleSaveReport` / `deleteReport`)

## Quick checklist for code changes (use before PRs)

- Ensure env var naming is consistent and documented in README and code (pick one: `process.env.API_KEY` or `import.meta.env.VITE_API_KEY`).
- When adding prompt logic, return strictly parseable JSON (follow `discoverSchema` and `generateReportData` examples).
- Update `types.ts` and any UI consumers when changing data shapes; follow `exposed` conventions.

---

If any part of this is unclear or you want more examples (e.g., how to update the prompts safely or where to add tests), tell me which area to expand and I’ll iterate. ✅
