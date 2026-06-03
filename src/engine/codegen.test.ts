import { describe, it, expect } from 'vitest'
import { generateCode } from './codegen.js'
import type { UserInputs } from './codegen.js'
import fhEblup from '../catalogue/fh-eblup.js'
import bhfEblup from '../catalogue/bhf-eblup.js'
import ebpCensuseb from '../catalogue/ebp-censuseb.js'
import glmmBinary from '../catalogue/glmm-binary.js'

// ── Helpers ────────────────────────────────────────────────────────────────────

function assertNoUnreplacedTokens(script: string, label: string): void {
  const match = script.match(/\{\{[A-Z_]+\}\}/)
  expect(match, `${label} still contains unreplaced token: ${match?.[0]}`).toBeNull()
}

function assertAllVarsPresent(script: string, vars: string[], label: string): void {
  for (const v of vars) {
    expect(script, `${label} missing variable "${v}"`).toContain(v)
  }
}

// ── Shared variable sets ───────────────────────────────────────────────────────

const FH_INPUTS: UserInputs = {
  targetVar: 'poverty_rate',
  areaIdVar: 'district',
  auxiliaryVars: ['edu_rate', 'urban_pct'],
  directEstVar: 'dir_est',
  directVarVar: 'dir_var',
  surveyDataPath: 'survey.csv',
  censusDataPath: 'area_data.csv',
  stataVersion: 14,
  nSimulations: 200,
  mseMethod: 'analytic',
}

const BHF_INPUTS: UserInputs = {
  targetVar: 'income',
  areaIdVar: 'region',
  auxiliaryVars: ['x1', 'x2', 'x3'],
  surveyDataPath: 'survey.csv',
  censusDataPath: 'census.csv',
  stataVersion: 14,
  nSimulations: 200,
}

const EBP_INPUTS: UserInputs = {
  targetVar: 'cons_pc',
  areaIdVar: 'ea_code',
  auxiliaryVars: ['hhsize', 'edu_head', 'urban'],
  surveyDataPath: 'survey.csv',
  censusDataPath: 'census.csv',
  stataVersion: 14,   // below stataMinVersion:17 → triggers fallback
  nSimulations: 200,
}

const GLMM_INPUTS: UserInputs = {
  targetVar: 'employed',
  areaIdVar: 'province',
  auxiliaryVars: ['age', 'education'],
  surveyDataPath: 'survey.csv',
  censusDataPath: 'census.csv',
  stataVersion: 14,
  nSimulations: 200,
}

// ── Fay–Herriot EBLUP ─────────────────────────────────────────────────────────
describe('generateCode — fh-eblup (area-level, standard)', () => {
  const code = generateCode(fhEblup, FH_INPUTS)

  it('R script contains library(sae)', () => {
    expect(code.r).toContain('library(sae)')
  })

  it('R script contains library(', () => {
    expect(code.r).toContain('library(')
  })

  it('Stata script contains the fhsae command', () => {
    expect(code.stata).toContain('fhsae')
  })

  it('R script contains all FH-relevant variable names', () => {
    // FH is area-level: uses direct estimate + variance columns, not raw targetVar
    assertAllVarsPresent(code.r, ['district', 'edu_rate', 'urban_pct', 'dir_est', 'dir_var'], 'R')
  })

  it('Stata script contains all FH-relevant variable names', () => {
    // fhsae does not take an area-id argument — district is absent from Stata template
    assertAllVarsPresent(code.stata, ['edu_rate', 'urban_pct', 'dir_est', 'dir_var'], 'Stata')
  })

  it('R script has no unreplaced {{ tokens', () => assertNoUnreplacedTokens(code.r, 'R'))
  it('Stata script has no unreplaced {{ tokens', () => assertNoUnreplacedTokens(code.stata, 'Stata'))

  it('does not use fallback (stataMinVersion 14)', () => {
    expect(code.usedFallback).toBe(false)
    expect(code.fallbackNote).toBeUndefined()
  })

  it('R script contains MSE footer', () => {
    expect(code.r).toContain('MSE / RMSE INTERPRETATION')
  })

  it('Stata script contains MSE footer', () => {
    expect(code.stata).toContain('MSE / RMSE INTERPRETATION')
  })

  it('AUX_VARS_R produces formula form (+ separated)', () => {
    expect(code.r).toContain('edu_rate + urban_pct')
  })

  it('AUX_VARS_STATA produces space-separated form', () => {
    expect(code.stata).toContain('edu_rate urban_pct')
  })
})

// ── BHF-EBLUP (unit-level) ────────────────────────────────────────────────────
describe('generateCode — bhf-eblup (unit-level, standard)', () => {
  const code = generateCode(bhfEblup, BHF_INPUTS)

  it('R script contains library(sae)', () => {
    expect(code.r).toContain('library(sae)')
  })

  it('Stata script contains the mixed command', () => {
    expect(code.stata).toContain('mixed')
  })

  it('R script contains all user-supplied variable names', () => {
    assertAllVarsPresent(code.r, ['income', 'region', 'x1', 'x2', 'x3'], 'R')
  })

  it('Stata script contains all user-supplied variable names', () => {
    assertAllVarsPresent(code.stata, ['income', 'region', 'x1', 'x2', 'x3'], 'Stata')
  })

  it('R script has no unreplaced {{ tokens', () => assertNoUnreplacedTokens(code.r, 'R'))
  it('Stata script has no unreplaced {{ tokens', () => assertNoUnreplacedTokens(code.stata, 'Stata'))

  it('does not use fallback (stataMinVersion 14)', () => {
    expect(code.usedFallback).toBe(false)
  })

  it('AUX_VARS_R_VEC produces quoted column-selection form', () => {
    // bhf-eblup template uses {{AUX_VARS_R_VEC}} inside c(...) for census column selection
    expect(code.r).toContain('"x1", "x2", "x3"')
  })

  it('census data path is substituted', () => {
    expect(code.r).toContain('census.csv')
    expect(code.stata).toContain('survey.csv')
  })
})

// ── EBP / CensusEB — poverty mapping with Stata v14 fallback ─────────────────
describe('generateCode — ebp-censuseb (poverty mapping, stataVersion:14)', () => {
  const code = generateCode(ebpCensuseb, EBP_INPUTS)

  it('R script contains library(povmap)', () => {
    expect(code.r).toContain('library(povmap)')
  })

  it('usedFallback is true (stataVersion 14 < stataMinVersion 17)', () => {
    expect(code.usedFallback).toBe(true)
  })

  it('fallbackNote is a non-empty string', () => {
    expect(typeof code.fallbackNote).toBe('string')
    expect(code.fallbackNote!.length).toBeGreaterThan(0)
  })

  it('Stata output uses the mixed command (fallback)', () => {
    expect(code.stata).toContain('mixed')
  })

  it('Stata output does NOT use the sae model command (full impl not available on v14)', () => {
    expect(code.stata).not.toContain('sae model')
  })

  it('R script contains all user-supplied variable names', () => {
    assertAllVarsPresent(code.r, ['cons_pc', 'ea_code', 'hhsize', 'edu_head', 'urban'], 'R')
  })

  it('Stata script contains all user-supplied variable names', () => {
    assertAllVarsPresent(code.stata, ['cons_pc', 'ea_code', 'hhsize', 'edu_head', 'urban'], 'Stata')
  })

  it('R script has no unreplaced {{ tokens', () => assertNoUnreplacedTokens(code.r, 'R'))
  it('Stata script has no unreplaced {{ tokens', () => assertNoUnreplacedTokens(code.stata, 'Stata'))

  it('N_SIM is substituted in R script', () => {
    expect(code.r).toContain('200')
  })
})

// ── GLMM-binary ───────────────────────────────────────────────────────────────
describe('generateCode — glmm-binary (binary target)', () => {
  const code = generateCode(glmmBinary, GLMM_INPUTS)

  it('R script contains library(lme4)', () => {
    expect(code.r).toContain('library(lme4)')
  })

  it('Stata script contains the meglm command', () => {
    expect(code.stata).toContain('meglm')
  })

  it('R script contains all user-supplied variable names', () => {
    assertAllVarsPresent(code.r, ['employed', 'province', 'age', 'education'], 'R')
  })

  it('Stata script contains all user-supplied variable names', () => {
    assertAllVarsPresent(code.stata, ['employed', 'province', 'age', 'education'], 'Stata')
  })

  it('R script has no unreplaced {{ tokens', () => assertNoUnreplacedTokens(code.r, 'R'))
  it('Stata script has no unreplaced {{ tokens', () => assertNoUnreplacedTokens(code.stata, 'Stata'))

  it('does not use fallback (stataMinVersion 14)', () => {
    expect(code.usedFallback).toBe(false)
  })

  it('R script uses logit random-intercept structure', () => {
    expect(code.r).toContain('binomial(link = "logit")')
  })

  it('Stata script uses bernoulli logit family', () => {
    expect(code.stata).toContain('family(bernoulli)')
  })
})

// ── v14 fallback — general property tests ─────────────────────────────────────
describe('generateCode — Stata v14 fallback logic', () => {
  it('usedFallback true when stataVersion < stataMinVersion and fallback exists', () => {
    const code = generateCode(ebpCensuseb, { ...EBP_INPUTS, stataVersion: 16 })
    expect(code.usedFallback).toBe(true)
  })

  it('usedFallback false when stataVersion >= stataMinVersion', () => {
    const code = generateCode(ebpCensuseb, { ...EBP_INPUTS, stataVersion: 17 })
    expect(code.usedFallback).toBe(false)
    expect(code.fallbackNote).toBeUndefined()
  })

  it('Stata v17 output uses the full sae model command (not mixed)', () => {
    const code = generateCode(ebpCensuseb, { ...EBP_INPUTS, stataVersion: 17 })
    expect(code.stata).toContain('sae model')
  })

  it('no unreplaced tokens in fallback Stata output', () => {
    const code = generateCode(ebpCensuseb, { ...EBP_INPUTS, stataVersion: 14 })
    assertNoUnreplacedTokens(code.stata, 'Stata fallback')
  })
})

// ── Token substitution edge cases ──────────────────────────────────────────────
describe('generateCode — token substitution', () => {
  it('single auxiliary variable: AUX_VARS_R produces plain name (no +)', () => {
    const code = generateCode(fhEblup, { ...FH_INPUTS, auxiliaryVars: ['x1'] })
    expect(code.r).toContain('x1')
    expect(code.r).not.toContain('x1 + ')
  })

  it('three auxiliary variables: AUX_VARS_R produces x1 + x2 + x3', () => {
    const code = generateCode(fhEblup, { ...FH_INPUTS, auxiliaryVars: ['x1', 'x2', 'x3'] })
    expect(code.r).toContain('x1 + x2 + x3')
  })

  it('AUX_VARS_R_VEC with two vars produces "x1", "x2"', () => {
    const code = generateCode(bhfEblup, { ...BHF_INPUTS, auxiliaryVars: ['x1', 'x2'] })
    expect(code.r).toContain('"x1", "x2"')
  })

  it('N_SIM default is 200 when nSimulations not provided', () => {
    const code = generateCode(ebpCensuseb, { ...EBP_INPUTS, stataVersion: 17, nSimulations: undefined })
    expect(code.r).toContain('200')
  })

  it('custom nSimulations is substituted', () => {
    const code = generateCode(ebpCensuseb, { ...EBP_INPUTS, stataVersion: 17, nSimulations: 500 })
    expect(code.r).toContain('500')
  })

  it('generateCode is pure: two calls with same inputs produce identical output (modulo date)', () => {
    const a = generateCode(fhEblup, FH_INPUTS)
    const b = generateCode(fhEblup, FH_INPUTS)
    // Strip the date line before comparing (dates may differ by a second in slow CI)
    const stripDate = (s: string) => s.replace(/\d{4}-\d{2}-\d{2}/, 'DATE')
    expect(stripDate(a.r)).toBe(stripDate(b.r))
    expect(stripDate(a.stata)).toBe(stripDate(b.stata))
  })
})
