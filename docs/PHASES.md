# SAE Syntax Generator — Phased Build Plan

## How to use this document
Each phase is one Claude Code session. At the start of each session, paste the **Session opener**
for that phase. At the end, Claude Code prints the **Phase review report** so the user can paste
it into claude.ai for sign-off before the next session begins.

Phases are sequential. Do not start Phase N+1 until the user has approved Phase N's PR.

---

## Review report template
Print this at the end of every phase, filled in:

```
=== PHASE [N] REVIEW REPORT ===
Branch:        phase/N-<slug>
PR:            https://github.com/<user>/<repo>/pull/<number>
Build:         PASS / FAIL
Tests:         PASS (N passed, 0 failed) / FAIL (details)
Lint:          PASS / FAIL

What was built:
- <bullet summary of files created or changed>

Acceptance criteria:
- [x] criterion 1
- [x] criterion 2
- [ ] criterion 3 — <reason if not met>

Known gaps or decisions deferred:
- <any trade-offs made, anything left for a later phase>

Ready for review: YES / NO
```

---

## Phase 0 — Repository and scaffolding

**Goal:** A clean, building, tested project skeleton on GitHub, with CI green.

**Session opener:**
```
Read CLAUDE.md. Then execute Phase 0 from docs/PHASES.md in full.
Do not start Phase 1.
```

**Tasks:**
1. Initialise Git; create the GitHub repo at the URL in CLAUDE.md; push an initial commit.
2. Scaffold with `npm create vite@latest` — React + TypeScript template.
3. Install and configure Tailwind CSS (v3).
4. Install Vitest and write one passing smoke test (`src/app.test.ts` — assert `1 + 1 === 2`).
5. Install Playwright; write one e2e test that opens the dev server and asserts the page title
   contains "SAE".
6. Install ESLint (with `@typescript-eslint`) and Prettier; add `.eslintrc` and `.prettierrc`.
7. Add a GitHub Actions workflow (`.github/workflows/ci.yml`) that runs `npm run build`,
   `npm test`, and `npm run lint` on push and pull request.
8. Add a GitHub Actions workflow (`.github/workflows/deploy.yml`) that deploys `dist/` to
   GitHub Pages on merge to `main`.
9. Add `LICENSE` (MIT), a stub `README.md` (project name, one-sentence description, "setup
   instructions coming in Phase 6"), and `.gitignore`.
10. Create empty placeholder directories: `src/catalogue/`, `src/engine/`, `src/wizard/`,
    `docs/`.
11. Copy `docs/PHASES.md` and `docs/SAE-CATALOGUE.md` into the repo.
12. Tag `v0.0.1` and push.

**Acceptance criteria:**
- `npm run build` exits 0 with no errors.
- `npm test` passes all tests (Vitest + Playwright).
- `npm run lint` exits 0.
- CI workflow runs green on GitHub.
- GitHub Pages deployment workflow is present (need not have fired yet).
- Repo is public with MIT licence.

---

## Phase 1 — Domain model and method catalogue

**Goal:** Typed domain model + all 16 catalogue entries validated by tests.

**Session opener:**
```
Read CLAUDE.md. Phase 0 is merged. Execute Phase 1 from docs/PHASES.md.
The method specifications are in docs/SAE-CATALOGUE.md — treat that as the
source of truth for every field value. Do not start Phase 2.
```

**Tasks:**

### 1a — TypeScript types (`src/types/index.ts`)
Define and export these types:

```typescript
// Variable roles the user assigns in the wizard
type VariableRole =
  | 'target'        // the outcome to estimate
  | 'area-id'       // small area identifier
  | 'weight'        // survey sampling weight
  | 'auxiliary'     // covariate available in survey and population
  | 'coordinate'    // geographic coordinate (lat/lon or centroid)
  | 'direct-est'    // pre-computed direct estimate (area-level)
  | 'direct-var'    // sampling variance of the direct estimate
  | 'ignored';

// Variable types inferred or confirmed by the user
type VariableType =
  | 'continuous'
  | 'binary'
  | 'proportion'
  | 'count'
  | 'categorical'
  | 'identifier'
  | 'unknown';

// A variable entry from the data dictionary / codebook
interface Variable {
  name: string;
  label?: string;
  type: VariableType;
  role: VariableRole;
  categories?: string[];   // for categorical variables
  notes?: string;
}

// Flags describing what data the user has available
interface DataAvailability {
  hasMicrodata: boolean;          // unit-level survey data
  hasAreaAggregates: boolean;     // pre-computed area-level estimates + variances
  hasWeights: boolean;            // sampling weights in microdata
  hasCensusAuxiliaries: boolean;  // population-level auxiliaries (unit or area)
  hasContiguityMatrix: boolean;   // spatial adjacency / weight matrix
  hasCoordinates: boolean;        // centroid or unit coordinates
  hasOutOfSampleAreas: boolean;   // areas with ni = 0
  targetType: 'continuous' | 'binary' | 'proportion' | 'count' | 'poverty' | 'unknown';
  likelyOutliers: boolean;
  likelySpatialCorrelation: boolean;
}

// One entry in the method catalogue
interface CatalogueEntry {
  id: string;                      // e.g. 'fh-eblup'
  displayName: string;
  level: 'area' | 'unit' | 'model-assisted';
  inferenceType: 'frequentist' | 'bayesian' | 'design-based';
  targetTypes: DataAvailability['targetType'][];
  requiredInputs: {
    microdata: boolean;
    areaAggregates: boolean;       // direct estimates + variances
    censusAuxiliaries: 'unit' | 'area' | 'either' | 'none';
    weights: boolean;
    contiguityMatrix: boolean;
    coordinates: boolean;
  };
  spatial: boolean;
  robust: boolean;
  mseMethod: 'prasad-rao' | 'bootstrap' | 'both' | 'posterior';
  rPackage: string;
  rFunction: string;
  rTemplate: string;               // template literal with {{PLACEHOLDER}} tokens
  stataPackage: string;
  stataCommand: string;
  stataMinVersion: number;         // e.g. 14, 16, 17
  stataV14Fallback: string | null; // fallback .do template if stataMinVersion > 14
  stataTemplate: string;
  plainDescription: string;        // 2–3 sentences, no jargon
  whyChooseThis: string;           // shown in "Why this method?" panel
  assumptions: string[];           // surfaced to the user before generating code
  references: string[];
  caveats?: string[];
}
```

### 1b — Catalogue files (`src/catalogue/<id>.ts`)
Create one `.ts` file per method using the schema above. Seed all fields from
`docs/SAE-CATALOGUE.md`. Use realistic placeholder templates (variable-name tokens such as
`{{TARGET_VAR}}`, `{{AREA_ID}}`, `{{AUX_VARS}}`, `{{WEIGHT_VAR}}`, etc.) rather than empty strings.

Methods to create (16 files):
`direct.ts`, `greg.ts`, `fh-eblup.ts`, `spatial-fh.ts`, `robust-fh.ts`, `hb-fh.ts`,
`bhf-eblup.ts`, `ebp-censuseb.ts`, `ell.ts`, `m-quantile.ts`, `mqgwr.ts`, `reblup.ts`,
`glmm-binary.ts`, `glmm-count.ts`, `two-part-zinfl.ts`, `hb-unit.ts`.

Create `src/catalogue/index.ts` that imports and exports all entries as a typed array.

### 1c — Schema validation tests (`src/catalogue/catalogue.test.ts`)
Write a Vitest test that imports every catalogue entry and asserts:
- All required fields are present and non-empty.
- `stataMinVersion` is a number ≥ 14.
- If `stataMinVersion > 14`, `stataV14Fallback` is non-null.
- `rTemplate` contains at least one `{{` token.
- `stataTemplate` contains at least one `{{` token.
- `references` has at least one entry.
- `assumptions` has at least one entry.

**Acceptance criteria:**
- All 16 catalogue files exist and export a valid `CatalogueEntry`.
- `npm test` passes with all catalogue schema tests green.
- No `any` types in `src/types/index.ts` or catalogue files.

---

## Phase 2 — Recommender engine

**Goal:** A pure, thoroughly tested function that maps `DataAvailability` to a ranked list of
recommended methods with plain-language rationale and caveats.

**Session opener:**
```
Read CLAUDE.md. Phase 1 is merged. Execute Phase 2 from docs/PHASES.md.
The recommender logic table is in docs/SAE-CATALOGUE.md §3. Do not start Phase 3.
```

**Tasks:**

### 2a — Recommender function (`src/engine/recommender.ts`)
```typescript
interface Recommendation {
  entry: CatalogueEntry;
  rank: number;          // 1 = most appropriate; lower is better
  whyApplicable: string; // 1–2 sentences shown to the user
  caveats: string[];     // warnings to display (Stata version, assumptions, etc.)
  stataV14Warning: boolean;
}

function recommend(availability: DataAvailability): Recommendation[]
```

Rules (from `docs/SAE-CATALOGUE.md` §3):
- Direct estimator is always included at the bottom as a benchmark, ranked last.
- Exclude methods whose `requiredInputs` are not satisfied by `availability`.
- Rank by fit: prefer methods that use the richest available data.
- Append `stataV14Warning: true` for any method with `stataMinVersion > 14`.
- Append human-readable caveats from the entry's `caveats` field plus any inferred ones
  (e.g. "You indicated likely outliers — consider M-quantile or REBLUP instead" when the user
  selects a non-robust method but `likelyOutliers` is true).

### 2b — Recommender tests (`src/engine/recommender.test.ts`)
Write a table-driven test with at least 12 scenarios, covering:
- Area aggregates only, continuous target → FH should rank first.
- Microdata + area auxiliaries, continuous → BHF-EBLUP should appear; direct is last.
- Poverty/non-linear target + microdata + census → EBP/CensusEB ranks first; ELL present.
- Binary target + microdata → GLMM-binary ranks above FH.
- Count target → GLMM-count appears; ZI/two-part flagged as an option.
- Outlier flag + continuous → M-quantile and REBLUP ranked above standard EBLUP.
- Spatial flag → spatial-FH or SEBLUP present and ranked above non-spatial.
- No microdata, no area aggregates → only direct (degraded) is returned.
- Out-of-sample areas flag → methods that handle OOS are preferred; caveats for synthetic.
- Weights present → pseudo-EBLUP / weighted EBP noted.
- Stata 14 selected + method needs v17 → `stataV14Warning: true` in that recommendation.
- Every recommendation has a non-empty `whyApplicable` string.

**Acceptance criteria:**
- All 12+ test scenarios pass.
- `recommend()` is a pure function (no side effects, no imports from `src/wizard/`).
- Full TypeScript strict-mode compliance.

---

## Phase 3 — Code-generation engine

**Goal:** A tested function that fills R and Stata templates from user inputs and produces
downloadable scripts.

**Session opener:**
```
Read CLAUDE.md. Phase 2 is merged. Execute Phase 3 from docs/PHASES.md.
The template tokens and expected script structure for each method are in
docs/SAE-CATALOGUE.md §4. Do not start Phase 4.
```

**Tasks:**

### 3a — Token map (`src/engine/codegen.ts`)
```typescript
interface UserInputs {
  targetVar: string;
  areaIdVar: string;
  auxiliaryVars: string[];
  weightVar?: string;
  directEstVar?: string;       // pre-computed direct estimate column
  directVarVar?: string;       // sampling variance column
  coordinateLat?: string;
  coordinateLon?: string;
  contiguityMatrixPath?: string;
  censusDataPath?: string;
  surveyDataPath?: string;
  stataVersion: number;        // user-declared Stata version
  nSimulations?: number;       // for EBP / ELL bootstrap (default 200)
  mseMethod?: 'analytic' | 'bootstrap';
}

interface GeneratedCode {
  r: string;      // full .R script content
  stata: string;  // full .do script content
  usedFallback: boolean;
  fallbackNote?: string;
}

function generateCode(entry: CatalogueEntry, inputs: UserInputs): GeneratedCode
```

- Substitute all `{{TOKEN}}` placeholders in `entry.rTemplate` and `entry.stataTemplate`.
- Handle multi-variable tokens: `{{AUX_VARS}}` → comma-separated in R, space-separated in Stata.
- Prepend a header block to each script with: method name, generated date, data paths, and
  a reminder to cite the relevant package and paper.
- If `inputs.stataVersion < entry.stataMinVersion` and `entry.stataV14Fallback` is non-null,
  use the fallback template and set `usedFallback: true`.
- Append a footer to each script with: MSE/RMSE interpretation notes, and a "next steps"
  comment pointing to the plain-English documentation.

### 3b — Snapshot tests (`src/engine/codegen.test.ts`)
Generate scripts for four methods and snapshot-test the output:
- `fh-eblup` (area-level, standard case)
- `bhf-eblup` (unit-level, standard case)
- `ebp-censuseb` (poverty mapping case)
- `glmm-binary` (binary target case)

For each: assert the R script contains `library(`, the Stata `.do` contains the correct command
name, all user-supplied variable names appear in the output, and no unreplaced `{{` tokens remain.

Also test the v14 fallback: call `generateCode` with `stataVersion: 14` on a method with
`stataMinVersion: 17`; assert `usedFallback === true` and the Stata output uses `mixed`.

**Acceptance criteria:**
- All snapshot tests pass.
- No unreplaced `{{` tokens in any generated script.
- v14 fallback logic tested and green.
- `generateCode` is a pure function.

---

## Phase 4 — Input wizard UI

**Goal:** A complete, usable five-step wizard that a non-statistician can navigate from codebook
to downloaded scripts without external instructions.

**Session opener:**
```
Read CLAUDE.md. Phase 3 is merged. Execute Phase 4 from docs/PHASES.md.
Use the recommender (src/engine/recommender.ts) and code generator
(src/engine/codegen.ts) built in Phases 2–3. Do not start Phase 5.
```

**Tasks:**

### Step 1 — Data dictionary import (`src/wizard/Step1Import.tsx`)
- Upload a CSV codebook (columns: `name`, `label`, `type`) via papaparse, OR
- Build it manually by adding variables row by row.
- Parse and display a preview table.
- Validate: at least one variable present; CSV must have `name` column.
- Plain-language instruction: "Upload your codebook, or add variables one by one."

### Step 2 — Variable roles and type confirmation (`src/wizard/Step2Roles.tsx`)
- For each variable, show a dropdown to assign `VariableRole` and confirm `VariableType`.
- Auto-suggest roles where possible (e.g. a variable named `weight*` → role = `weight`).
- Validate: exactly one `target`, at least one `area-id`, at least one `auxiliary`.
- Tooltip on each role explaining what it means in plain English.

### Step 3 — Data availability (`src/wizard/Step3Availability.tsx`)
- Checkbox/radio form to set `DataAvailability` flags.
- Plain-language labels: e.g. "I have individual household/unit records (microdata)" not
  "hasMicrodata".
- Ask about: weights, census auxiliaries, geographic data, out-of-sample areas, likely outliers,
  likely spatial correlation, and the user's Stata version.
- Tooltip on each flag.

### Step 4 — Method recommendation and selection (`src/wizard/Step4Methods.tsx`)
- Call `recommend()` with the assembled `DataAvailability`.
- Show a ranked card list: method name, 1-sentence description, R package, Stata command,
  MSE approach, "Why this method?" expandable panel (shows `whyChooseThis` and `assumptions`).
- Badge each card: "Area-level", "Unit-level", "Bayesian", "Robust", "Spatial", "⚠ Stata 14 workaround".
- Let the user select exactly one method and optionally tick a "also generate for comparison"
  second method.

### Step 5 — Options and download (`src/wizard/Step5Generate.tsx`)
- Show a summary of selected method + variable assignments.
- Allow overriding `nSimulations` (EBP/ELL only), MSE method (analytic/bootstrap), and
  data file paths (default `"survey.csv"` / `"census.csv"`).
- Two buttons: "Download R script (.R)" and "Download Stata script (.do)".
- Display the scripts in syntax-highlighted `<pre>` blocks for preview.
- If `usedFallback`, show a yellow banner: "Your Stata version (14) does not support
  [package]. The script uses the base `mixed` command instead. See the note at the top of
  the .do file for details."

### Navigation and shared state
- Use React Context or Zustand (lightweight) for wizard state across steps.
- A top progress bar showing steps 1–5.
- Back / Next buttons; Next is disabled until the current step validates.
- A "Start over" button that clears state.

### E2E smoke test (`e2e/wizard.spec.ts`)
Using Playwright, run one happy-path scenario:
1. Upload a minimal CSV codebook (`test-codebook.csv` committed to `e2e/fixtures/`).
2. Assign roles (target, area-id, two auxiliaries, weight).
3. Set availability flags (microdata, weights, no spatial, no outliers, Stata 14).
4. Verify at least one method card is shown and the FH-EBLUP card is present.
5. Select FH-EBLUP.
6. Click "Download R script" and verify a download is triggered.

**Acceptance criteria:**
- All five wizard steps render without errors.
- Validation prevents advancing with missing required inputs.
- Both download buttons produce non-empty files with no unreplaced `{{` tokens.
- Stata v14 fallback banner appears when appropriate.
- Playwright e2e test passes.

---

## Phase 5 — Offline/PWA and deployment

**Goal:** Installable offline PWA live on GitHub Pages.

**Session opener:**
```
Read CLAUDE.md. Phase 4 is merged. Execute Phase 5 from docs/PHASES.md.
Do not start Phase 6.
```

**Tasks:**
1. Install and configure `vite-plugin-pwa`. Cache strategy: `CacheFirst` for assets,
   `NetworkFirst` for the HTML shell.
2. Create `public/manifest.webmanifest` with: name, short name, icons (generate simple SVG
   placeholder icons if none exist), `start_url`, `display: standalone`.
3. Register the service worker in `src/main.tsx`.
4. Update the GitHub Actions deploy workflow to set `base` correctly for GitHub Pages
   (sub-path deployment).
5. Verify offline operation: build, serve locally, disable network in browser DevTools, reload —
   app must load fully and the wizard must be completable offline.
6. Document the Pages URL in `README.md`.

**Acceptance criteria:**
- Lighthouse PWA score ≥ 90 (run `npx lighthouse` locally).
- App loads and wizard completes with network disabled.
- GitHub Actions deploy workflow runs successfully and the Pages URL is live.
- `npm run build` and `npm test` still pass.

---

## Phase 6 — Documentation and extensibility

**Goal:** A maintainable, well-documented v1.0.0 release that a non-developer can extend.

**Session opener:**
```
Read CLAUDE.md. Phase 5 is merged. Execute Phase 6 from docs/PHASES.md.
Do not create new features — documentation and polish only.
```

**Tasks:**
1. **README.md** — Expand to include: one-paragraph description, live URL, screenshot or GIF
   of the wizard, quick-start (clone + `npm install` + `npm run dev`), how to run tests, how
   to deploy, link to `docs/adding-a-method.md`.
2. **CONTRIBUTING.md** — Code of conduct stub, how to open issues, how to submit a PR,
   coding conventions, and a link to `docs/adding-a-method.md`.
3. **docs/adding-a-method.md** — Step-by-step guide for adding a new SAE method without
   touching engine code. Walk through: copy an existing catalogue file, fill in each field,
   explain template tokens, test with `npm test`, open a PR. Include a worked example.
4. **docs/stata-v14-notes.md** — Which methods work fully on Stata 14, which use the `mixed`
   fallback, which are unavailable, and why. Link to the relevant World Bank package notes.
5. **"Learn more" links** — In each catalogue file's `references` array, ensure every entry
   has a URL where possible. In the wizard's Step 4 method cards, render these as links.
6. **Tooltips audit** — Check every wizard step for missing tooltips; add plain-English
   explanations for any that are missing.
7. Tag `v1.0.0` and push.

**Acceptance criteria:**
- `docs/adding-a-method.md` is complete enough that a non-developer can follow it alone.
- `docs/stata-v14-notes.md` covers all 16 methods.
- README has the live URL and quick-start instructions.
- `npm run build`, `npm test`, and `npm run lint` all pass.
- v1.0.0 tagged on GitHub.
