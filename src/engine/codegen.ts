import type { CatalogueEntry } from '../types/index.js'

export interface UserInputs {
  targetVar: string
  areaIdVar: string
  auxiliaryVars: string[]
  // Column names holding the sampling variance of each auxiliary estimate, in the
  // same order as auxiliaryVars. Used by the measurement-error Fay–Herriot model.
  auxiliaryVarianceVars?: string[]
  weightVar?: string
  directEstVar?: string
  directVarVar?: string
  coordinateLat?: string
  coordinateLon?: string
  contiguityMatrixPath?: string
  censusDataPath?: string     // unit-level census microdata (EBP, BHF, ELL, HB-unit)
  areaDataPath?: string       // area-level file with direct estimates + area auxiliaries (FH, Spatial-FH, GREG)
  surveyDataPath?: string
  stataVersion: number
  nSimulations?: number
  mseMethod?: 'analytic' | 'bootstrap'
}

export interface GeneratedCode {
  r: string
  stata: string
  usedFallback: boolean
  fallbackNote?: string
}

// ── Ci array builder (measurement-error Fay–Herriot) ─────────────────────────────
// Generates the R code that assembles the per-domain measurement-error
// variance–covariance array `Ci` that emdi::fh(method = "me") requires. Ci has
// dimension (p+1) x (p+1) x m, where p is the number of auxiliary variables and m
// is the number of areas. The leading row/column is the intercept (zero variance),
// and off-diagonal covariances between auxiliaries are assumed zero unless
// covariance columns are supplied.
function buildCiArrayBuilderR(auxVarVarsRVec: string): string {
  return `# Build the per-domain measurement-error variance–covariance array Ci.
# Ci has dimension (p+1) x (p+1) x m, where p = number of auxiliary variables and
# m = number of areas. Position 1 of each matrix is the intercept and carries zero
# variance; positions 2..(p+1) hold the sampling variance of each auxiliary.
# Off-diagonal covariances between auxiliaries are assumed to be zero, because no
# covariance columns were supplied. If your auxiliary estimates are correlated,
# fill in the relevant off-diagonal entries of Ci by hand.
aux_var_cols <- c(${auxVarVarsRVec})
m  <- nrow(area_data)
p  <- length(aux_var_cols)
Ci <- array(0, dim = c(p + 1, p + 1, m))
for (i in seq_len(m)) {
  for (j in seq_len(p)) {
    Ci[j + 1, j + 1, i] <- area_data[i, aux_var_cols[j]]
  }
}`
}

// ── Token substitution ─────────────────────────────────────────────────────────

function buildTokenMap(inputs: UserInputs): Record<string, string> {
  const date = new Date().toISOString().slice(0, 10)
  const auxR = inputs.auxiliaryVars.join(' + ')
  const auxRVec = inputs.auxiliaryVars.map(v => `"${v}"`).join(', ')
  const auxStata = inputs.auxiliaryVars.join(' ')
  const auxVarVars = inputs.auxiliaryVarianceVars ?? []
  const auxVarVarsRVec = auxVarVars.map(v => `"${v}"`).join(', ')
  const survey = inputs.surveyDataPath ?? 'survey.csv'
  const census = inputs.censusDataPath ?? 'census.csv'
  const area = inputs.areaDataPath ?? 'area_data.csv'

  return {
    DATE: date,
    TARGET_VAR: inputs.targetVar,
    AREA_ID: inputs.areaIdVar,
    AUX_VARS_R: auxR,
    AUX_VARS_R_VEC: auxRVec,
    AUX_VARS_STATA: auxStata,
    AUX_VAR_VARIANCES_R: auxVarVarsRVec,
    CI_ARRAY_BUILDER_R: buildCiArrayBuilderR(auxVarVarsRVec),
    WEIGHT_VAR: inputs.weightVar ?? '',
    DIRECT_EST_VAR: inputs.directEstVar ?? '',
    DIRECT_VAR_VAR: inputs.directVarVar ?? '',
    SURVEY_DATA: survey,
    CENSUS_DATA: census,   // unit-level census microdata
    AREA_DATA: area,       // area-level aggregates (direct estimates + area auxiliaries)
    CONTIG_MATRIX: inputs.contiguityMatrixPath ?? 'contiguity_matrix.csv',
    N_SIM: String(inputs.nSimulations ?? 200),
    MSE_METHOD: inputs.mseMethod ?? 'bootstrap',
  }
}

function substituteTokens(template: string, tokens: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(tokens)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
  }
  return result
}

// ── Footer ─────────────────────────────────────────────────────────────────────

const R_FOOTER = `
# ============================================================
# MSE / RMSE INTERPRETATION
# ============================================================
# MSE  — Mean Squared Error; measures average squared deviation from the
#         true area value.  Estimated by the method noted above.
# RMSE — sqrt(MSE); on the same scale as the target variable.
# CV   — Coefficient of Variation = RMSE / estimate.
#         Areas with CV > 0.25 have high relative uncertainty;
#         interpret model-based estimates cautiously for these areas.
#
# NEXT STEPS
# - Inspect the model diagnostics before publishing any estimates.
# - Compare model-based estimates against direct estimates as a sanity check.
# - See docs/adding-a-method.md to extend or adapt this script.
`

const STATA_FOOTER = `
* ============================================================
* MSE / RMSE INTERPRETATION
* ============================================================
* MSE  - Mean Squared Error; measures average squared deviation from the
*        true area value.  Estimated by the method noted above.
* RMSE - sqrt(MSE); on the same scale as the target variable.
* CV   - Coefficient of Variation = RMSE / estimate.
*        Areas with CV > 0.25 have high relative uncertainty;
*        interpret model-based estimates cautiously for these areas.
*
* NEXT STEPS
* - Inspect model diagnostics before publishing any estimates.
* - Compare model-based estimates against direct estimates as a sanity check.
* - See docs/adding-a-method.md to extend or adapt this script.
`

// ── Public API ─────────────────────────────────────────────────────────────────

export function generateCode(entry: CatalogueEntry, inputs: UserInputs): GeneratedCode {
  const usedFallback =
    inputs.stataVersion < entry.stataMinVersion && entry.stataV14Fallback !== null

  const tokens = buildTokenMap(inputs)

  const r = substituteTokens(entry.rTemplate, tokens) + R_FOOTER

  const stataRaw = usedFallback ? entry.stataV14Fallback! : entry.stataTemplate
  const stata = substituteTokens(stataRaw, tokens) + STATA_FOOTER

  const fallbackNote = usedFallback
    ? `Stata ${inputs.stataVersion} is below the minimum required version ` +
      `(v${entry.stataMinVersion}) for ${entry.displayName}. ` +
      `The generated .do file uses the base fallback command instead. ` +
      `Use the R script for the full implementation.`
    : undefined

  return { r, stata, usedFallback, fallbackNote }
}
