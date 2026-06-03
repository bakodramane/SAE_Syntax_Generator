import type { CatalogueEntry } from '../types/index.js'

export interface UserInputs {
  targetVar: string
  areaIdVar: string
  auxiliaryVars: string[]
  weightVar?: string
  directEstVar?: string
  directVarVar?: string
  coordinateLat?: string
  coordinateLon?: string
  contiguityMatrixPath?: string
  censusDataPath?: string
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

// ── Token substitution ─────────────────────────────────────────────────────────

function buildTokenMap(inputs: UserInputs): Record<string, string> {
  const date = new Date().toISOString().slice(0, 10)
  const auxR = inputs.auxiliaryVars.join(' + ')
  const auxRVec = inputs.auxiliaryVars.map(v => `"${v}"`).join(', ')
  const auxStata = inputs.auxiliaryVars.join(' ')
  const survey = inputs.surveyDataPath ?? 'survey.csv'
  const census = inputs.censusDataPath ?? 'census.csv'

  return {
    DATE: date,
    TARGET_VAR: inputs.targetVar,
    AREA_ID: inputs.areaIdVar,
    AUX_VARS_R: auxR,
    AUX_VARS_R_VEC: auxRVec,
    AUX_VARS_STATA: auxStata,
    WEIGHT_VAR: inputs.weightVar ?? '',
    DIRECT_EST_VAR: inputs.directEstVar ?? '',
    DIRECT_VAR_VAR: inputs.directVarVar ?? '',
    SURVEY_DATA: survey,
    CENSUS_DATA: census,
    AREA_DATA: census,       // area-level aggregates default to the same path as census
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
