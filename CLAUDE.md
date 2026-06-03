# SAE Syntax Generator — Project Constitution

## What this app is
A browser-only, offline-capable expert system that takes a description of a statistician's
survey microdata and auxiliary data, recommends appropriate small area estimation (SAE) methods,
and emits ready-to-run, well-commented `.R` and `.do` scripts. It does not run analyses itself.
Target users: statisticians in developing countries, possibly without advanced statistical training.

## Reference documents (read these when a phase requires them)
- `docs/PHASES.md` — full build plan, acceptance criteria, session openers, and review templates
- `docs/SAE-CATALOGUE.md` — method taxonomy, recommender logic, all 16 method entries, software
  mapping, and Stata v14 constraints

## Tech stack (do not deviate without asking)
- **Vite + React + TypeScript** — static SPA, no backend
- **Tailwind CSS** — styling; keep components simple and well-named
- **vite-plugin-pwa** (Workbox) — service worker + manifest for offline/PWA
- **papaparse** — CSV codebook import
- **Vitest** — unit tests; **Playwright** — one e2e smoke test per phase that needs it
- **GitHub Actions** — CI (build + test) and GitHub Pages deployment
- Template literals or a minimal Handlebars-style engine for code generation — no heavy deps

## Non-negotiable hard requirements
1. **Offline-first.** Runs fully in-browser with no backend. No data leaves the user's machine.
   Deploy as a static PWA to GitHub Pages; must pass a full offline load test.
2. **Human-editable catalogue.** Every SAE method lives in its own TypeScript catalogue file
   (`src/catalogue/<method-id>.ts`). The schema, applicability rules, R template, Stata template,
   and metadata must be editable by a non-developer without touching engine code.
3. **Dual-language output.** Every method emits both an R script and a Stata `.do` file, each
   self-contained with package install lines and comments. Stata templates carry a `stataMinVersion`
   field; when the user selects Stata 14 and the method needs more, show a warning and offer a
   base `mixed` / `meglm` fallback.
4. **Variable-type-aware recommender.** The recommender filters and ranks methods by: target
   variable type (continuous, binary/proportion, count, poverty/inequality), data availability
   (microdata vs area aggregates, survey weights, spatial data, out-of-sample areas), and
   likely violations (outliers, spatial correlation).
5. **Plain-language UI.** Linear wizard; tooltips everywhere; "Why this method?" expandable
   panels; friendly validation messages. No jargon in the primary path.
6. **Open source, MIT licence.** One GitHub repo; version-controlled from commit one.

## Git conventions
- **Branches:** `phase/0-scaffolding`, `phase/1-domain-model`, `phase/2-recommender`,
  `phase/3-codegen`, `phase/4-wizard-ui`, `phase/5-pwa-deploy`, `phase/6-docs`
- **Commits:** conventional format — `feat:`, `fix:`, `test:`, `docs:`, `chore:`
- **PRs:** one per phase; include the phase review template from `docs/PHASES.md`
- **Do not self-merge.** Open the PR and stop; the user reviews before the next phase starts.
- **Tags:** `v0.0.1` after Phase 0; `v1.0.0` after Phase 6.

## Working agreements
- Verify `npm run build` and `npm test` pass before every commit.
- Prefer clarity over cleverness — this codebase must be modifiable by non-experts.
- Surface every statistical assumption in the UI rather than hiding it.
- Ask before making architectural decisions that affect more than one phase.
- Use UK English with the Oxford comma in all documentation and UI text.
- At the end of every phase, print the phase review report (template in `docs/PHASES.md`).
