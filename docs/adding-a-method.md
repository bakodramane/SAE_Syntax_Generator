# Adding a New SAE Method to the Catalogue

This guide walks you through adding a new small area estimation method to the catalogue
without touching any engine code. All you need is one TypeScript file.

---

## Overview

Every SAE method lives in its own file under `src/catalogue/<method-id>.ts`. The recommender
and code-generation engines read these files automatically — you do not need to register the
method anywhere else (except in `src/catalogue/index.ts`, as described below).

The general workflow is:

1. Copy an existing catalogue file.
2. Fill in every field.
3. Write R and Stata templates with `{{PLACEHOLDER}}` tokens.
4. Register the new entry in `src/catalogue/index.ts`.
5. Run `npm test` — the schema tests will catch any missing or invalid fields.
6. Open a pull request.

---

## Step 1 — Choose a method ID

Pick a short, lower-case kebab-case identifier, e.g. `calinski-eblup` or `spatio-temporal-fh`.
Avoid spaces and special characters. This ID is used in URLs and as an internal key.

---

## Step 2 — Copy an existing file

Copy a file that is similar to your new method. For an area-level method, start from
`src/catalogue/fh-eblup.ts`. For a unit-level method, start from `src/catalogue/bhf-eblup.ts`.

```bash
cp src/catalogue/fh-eblup.ts src/catalogue/my-new-method.ts
```

---

## Step 3 — Fill in every field

Open `src/catalogue/my-new-method.ts` and edit each field. The full schema is defined in
`src/types/index.ts`. Here is a description of every field:

### Identification

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique kebab-case identifier, e.g. `'my-new-method'` |
| `displayName` | `string` | Short human-readable name shown in the UI |
| `level` | `'area' \| 'unit' \| 'model-assisted'` | Whether the model operates on area aggregates or unit microdata |
| `inferenceType` | `'frequentist' \| 'bayesian' \| 'design-based'` | Statistical paradigm |

### Data requirements

| Field | Type | Description |
|-------|------|-------------|
| `targetTypes` | `DataAvailability['targetType'][]` | Variable types this method supports: `'continuous'`, `'binary'`, `'proportion'`, `'count'`, `'poverty'`, `'unknown'` |
| `requiredInputs.microdata` | `boolean` | Does the method need unit-level survey records? |
| `requiredInputs.areaAggregates` | `boolean` | Does the method need pre-computed direct estimates and their variances? |
| `requiredInputs.censusAuxiliaries` | `'unit' \| 'area' \| 'either' \| 'none'` | What level of auxiliary data is needed |
| `requiredInputs.weights` | `boolean` | Are sampling weights required? |
| `requiredInputs.contiguityMatrix` | `boolean` | Is a spatial adjacency or weight matrix needed? |
| `requiredInputs.coordinates` | `boolean` | Are geographic coordinates needed? |

### Method properties

| Field | Type | Description |
|-------|------|-------------|
| `spatial` | `boolean` | Does the method explicitly model spatial dependence? |
| `robust` | `boolean` | Is the method robust to outliers (M-estimation or similar)? |
| `requiresAuxiliaryVariances` | `boolean` (optional) | Set `true` for measurement-error methods that need the sampling variances of the auxiliary estimates (e.g. `fh-me`). Treated as `false` when absent. When `true`, the recommender only offers the method if the user has declared sample-based auxiliaries, and it expects the variance columns to be supplied. |
| `mseMethod` | `'prasad-rao' \| 'bootstrap' \| 'both' \| 'posterior' \| 'jackknife'` | How mean squared error is estimated. Use `'jackknife'` for the measurement-error Fay–Herriot model, whose MSE is estimated by jackknife only. |

### Software

| Field | Type | Description |
|-------|------|-------------|
| `rPackage` | `string` | Primary R package name, e.g. `'sae'` |
| `rFunction` | `string` | Main function(s) used, e.g. `'eblupFH / mseFH'` |
| `stataPackage` | `string` | Stata user-written package name, or `'base'` for built-in commands |
| `stataCommand` | `string` | Main Stata command(s) used |
| `stataMinVersion` | `number` | Minimum Stata version required (≥ 14). Use `14` if the method works on Stata 14. |
| `stataV14Fallback` | `string \| null` | If `stataMinVersion > 14`, provide a `.do` template using `mixed` / `meglm` that runs on Stata 14. Otherwise `null`. |

### User-facing text

| Field | Type | Description |
|-------|------|-------------|
| `plainDescription` | `string` | 2–3 sentences in plain English with no statistical jargon |
| `whyChooseThis` | `string` | When should a user pick this method? Shown in the "Why this method?" panel |
| `assumptions` | `string[]` | List of model assumptions surfaced before code generation. At least one is required. |
| `caveats` | `string[]` (optional) | Any extra warnings (computational cost, edge cases, etc.) |
| `references` | `string[]` | Full citations, each including a URL where possible. At least one is required. |

### Code templates

The `rTemplate` and `stataTemplate` fields contain complete, runnable scripts as template
literal strings. Use `{{PLACEHOLDER}}` tokens (uppercase, underscores) for values that will
be substituted from user input.

**Standard tokens** (used by most methods):

| Token | Substituted with |
|-------|-----------------|
| `{{DATE}}` | Generation date |
| `{{TARGET_VAR}}` | Target variable name |
| `{{AREA_ID}}` | Small area identifier variable |
| `{{WEIGHT_VAR}}` | Sampling weight variable |
| `{{AUX_VARS_R}}` | Auxiliary variables as `var1 + var2 + ...` (R formula syntax) |
| `{{AUX_VARS_STATA}}` | Auxiliary variables as `var1 var2 ...` (space-separated) |
| `{{AUX_VARS_R_VEC}}` | Auxiliary variables as `c("var1", "var2", ...)` (R vector) |
| `{{AUX_VAR_VARIANCES_R}}` | Auxiliary sampling-variance column names as a quoted R character vector, e.g. `"var_x1", "var_x2"` (measurement-error methods) |
| `{{CI_ARRAY_BUILDER_R}}` | Generated R code that assembles the per-domain measurement-error variance–covariance array `Ci` from the variance columns (used by `fh-me`) |
| `{{SURVEY_DATA}}` | Path to the survey CSV file |
| `{{AREA_DATA}}` | Path to the area-level CSV file |
| `{{CENSUS_DATA}}` | Path to the census CSV file |
| `{{DIRECT_EST_VAR}}` | Pre-computed direct estimate column |
| `{{DIRECT_VAR_VAR}}` | Sampling variance column |
| `{{N_SIMULATIONS}}` | Number of bootstrap replications |

You may define additional tokens, but keep names descriptive and consistent with the style
above.

---

## Step 4 — Register the entry

Open `src/catalogue/index.ts` and add an import and entry for your new method:

```typescript
import myNewMethod from './my-new-method.js'

export const catalogue: CatalogueEntry[] = [
  // … existing entries …
  myNewMethod,
]
```

Place the entry in a logical position (e.g., near related methods).

---

## Step 5 — Run the tests

```bash
npm test
```

The catalogue schema test (`src/catalogue/catalogue.test.ts`) verifies:
- All required fields are present and non-empty.
- `stataMinVersion` is ≥ 14.
- If `stataMinVersion > 14`, `stataV14Fallback` is non-null.
- `rTemplate` and `stataTemplate` each contain at least one `{{` token.
- `references` and `assumptions` each have at least one entry.

Fix any failures before proceeding.

---

## Step 6 — Open a pull request

Push your branch and open a PR against `main`. In the PR description, include:

- The method name and ID.
- A short summary of what it does and when it should be recommended.
- The key references you used.
- Confirmation that `npm run build`, `npm test`, and `npm run lint` all pass.

---

## Worked example: Calinski spatio-temporal FH

Suppose you want to add a spatio-temporal extension of the Fay–Herriot model.

**File:** `src/catalogue/spatio-temporal-fh.ts`

```typescript
import type { CatalogueEntry } from '../types/index.js'

const entry: CatalogueEntry = {
  id: 'spatio-temporal-fh',
  displayName: 'Spatio-Temporal Fay–Herriot (Area-Level)',
  level: 'area',
  inferenceType: 'frequentist',
  targetTypes: ['continuous', 'proportion'],
  requiredInputs: {
    microdata: false,
    areaAggregates: true,
    censusAuxiliaries: 'area',
    weights: false,
    contiguityMatrix: true,
    coordinates: false,
  },
  spatial: true,
  robust: false,
  mseMethod: 'bootstrap',
  rPackage: 'sae2',
  rFunction: 'eblupSTFH',
  stataPackage: 'none',
  stataCommand: 'N/A — use R',
  stataMinVersion: 14,
  stataV14Fallback: null,
  plainDescription:
    'Extends the Fay–Herriot model to share strength across both space and time. ' +
    'Borrows information from neighbouring areas and from the same area in previous ' +
    'rounds. Requires area-level estimates for at least two time points.',
  whyChooseThis:
    'Choose this when you have area-level data for multiple survey rounds and a spatial ' +
    'adjacency matrix. It typically produces smaller mean squared errors than a ' +
    'cross-sectional FH model.',
  assumptions: [
    'Sampling variances of the direct estimates are known for all areas and periods.',
    'The spatial and temporal correlation structure is correctly specified.',
    'Area random effects are normally distributed.',
  ],
  references: [
    'Marhuenda, Y., Molina, I. & Morales, D. (2013). Computational Statistics & Data Analysis 58, 308–325. https://doi.org/10.1016/j.csda.2012.09.002',
    'sae2 package: CRAN. https://cran.r-project.org/package=sae2',
  ],
  rTemplate: `# ============================================================
# Spatio-Temporal Fay–Herriot EBLUP (Area-Level)
# Generated by SAE Syntax Generator on {{DATE}}
# Reference: Marhuenda et al. (2013)
# R package: sae2
# Area-level data: {{AREA_DATA}}
# ============================================================

if (!requireNamespace("sae2", quietly = TRUE)) install.packages("sae2")
library(sae2)

area_data <- read.csv("{{AREA_DATA}}")
# Required columns: {{DIRECT_EST_VAR}}, {{DIRECT_VAR_VAR}}, {{AUX_VARS_R}},
#                   {{AREA_ID}}, time (integer period index), proximity matrix

# Load the spatial proximity matrix (rows/columns ordered as areas in area_data)
# W <- as.matrix(read.csv("proximity_matrix.csv", row.names = 1))

result <- eblupSTFH(
  formula  = {{DIRECT_EST_VAR}} ~ {{AUX_VARS_R}},
  vardir   = area_data${{DIRECT_VAR_VAR}},
  proxmat  = W,
  data     = area_data
)

print(result$eblup)
`,
  stataTemplate: `* ============================================================
* Spatio-Temporal Fay–Herriot — not available in Stata
* Generated by SAE Syntax Generator on {{DATE}}
* Use the R script above with the sae2 package.
* ============================================================

* This method has no Stata implementation.
* Please switch to R and use the sae2 package.
`,
}

export default entry
```

Register it in `src/catalogue/index.ts`, run `npm test`, and open a PR.

---

## Tips

- Keep `plainDescription` jargon-free. Imagine explaining it to a government statistician
  who is a survey expert but not an SAE specialist.
- Always set `stataV14Fallback` when `stataMinVersion > 14`. A `null` value with
  `stataMinVersion > 14` will fail the schema test.
- If the method has no Stata implementation, set `stataMinVersion: 14` and write a Stata
  template that clearly says "Use R" rather than leaving the field blank.
- Use realistic variable names in the template comments (e.g. `income`, `area_id`) — they
  help users orient themselves before filling in their own names.
