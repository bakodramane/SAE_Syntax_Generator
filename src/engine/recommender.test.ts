import { describe, it, expect } from 'vitest'
import { recommend } from './recommender.js'
import type { DataAvailability } from '../types/index.js'

// Baseline availability object — override individual flags per test.
const base: DataAvailability = {
  hasMicrodata: false,
  hasAreaAggregates: false,
  hasWeights: false,
  hasCensusAuxiliaries: false,
  hasContiguityMatrix: false,
  hasCoordinates: false,
  hasOutOfSampleAreas: false,
  targetType: 'continuous',
  likelyOutliers: false,
  likelySpatialCorrelation: false,
  auxiliaryFromSample: false,
  hasAuxiliaryVariances: false,
}

function ids(recs: ReturnType<typeof recommend>): string[] {
  return recs.map(r => r.entry.id)
}

function rankOf(recs: ReturnType<typeof recommend>, id: string): number {
  const rec = recs.find(r => r.entry.id === id)
  if (!rec) throw new Error(`Method '${id}' not found in recommendations`)
  return rec.rank
}

// ── Scenario 1: Area aggregates only, continuous target → FH ranks first ───────
describe('Scenario 1 — area aggregates only, continuous target', () => {
  const avail: DataAvailability = {
    ...base,
    hasAreaAggregates: true,
    hasCensusAuxiliaries: true,
    targetType: 'continuous',
  }
  const recs = recommend(avail)

  it('returns results', () => expect(recs.length).toBeGreaterThan(0))
  it('FH-EBLUP ranks first', () => expect(recs[0].entry.id).toBe('fh-eblup'))
  it('direct estimator ranks last', () => expect(recs[recs.length - 1].entry.id).toBe('direct'))
  it('every recommendation has non-empty whyApplicable', () =>
    recs.forEach(r => expect(r.whyApplicable.length).toBeGreaterThan(0)))
})

// ── Scenario 2: Microdata + area auxiliaries, continuous → BHF first ───────────
describe('Scenario 2 — microdata + area auxiliaries, continuous target', () => {
  const avail: DataAvailability = {
    ...base,
    hasMicrodata: true,
    hasCensusAuxiliaries: true,
    targetType: 'continuous',
  }
  const recs = recommend(avail)

  it('BHF-EBLUP ranks first', () => expect(recs[0].entry.id).toBe('bhf-eblup'))
  it('BHF-EBLUP appears', () => expect(ids(recs)).toContain('bhf-eblup'))
  it('direct estimator ranks last', () => expect(recs[recs.length - 1].entry.id).toBe('direct'))
  it('every recommendation has non-empty whyApplicable', () =>
    recs.forEach(r => expect(r.whyApplicable.length).toBeGreaterThan(0)))
})

// ── Scenario 3: Poverty target + microdata + census → EBP first, ELL present ──
describe('Scenario 3 — poverty target, microdata + census', () => {
  const avail: DataAvailability = {
    ...base,
    hasMicrodata: true,
    hasWeights: true,
    hasCensusAuxiliaries: true,
    targetType: 'poverty',
  }
  const recs = recommend(avail)

  it('EBP/CensusEB ranks first', () => expect(recs[0].entry.id).toBe('ebp-censuseb'))
  it('ELL is present', () => expect(ids(recs)).toContain('ell'))
  it('EBP ranks above ELL', () => expect(rankOf(recs, 'ebp-censuseb')).toBeLessThan(rankOf(recs, 'ell')))
  it('direct estimator ranks last', () => expect(recs[recs.length - 1].entry.id).toBe('direct'))
})

// ── Scenario 4: Binary target + microdata → GLMM-binary above FH ───────────────
describe('Scenario 4 — binary target with microdata', () => {
  const avail: DataAvailability = {
    ...base,
    hasMicrodata: true,
    hasAreaAggregates: true,
    hasCensusAuxiliaries: true,
    targetType: 'binary',
  }
  const recs = recommend(avail)

  it('GLMM-binary ranks first', () => expect(recs[0].entry.id).toBe('glmm-binary'))
  it('FH-EBLUP is present', () => expect(ids(recs)).toContain('fh-eblup'))
  it('GLMM-binary ranks above FH-EBLUP', () =>
    expect(rankOf(recs, 'glmm-binary')).toBeLessThan(rankOf(recs, 'fh-eblup')))
  it('direct estimator ranks last', () => expect(recs[recs.length - 1].entry.id).toBe('direct'))
})

// ── Scenario 5: Count target → GLMM-count appears; two-part flagged ────────────
describe('Scenario 5 — count target', () => {
  const avail: DataAvailability = {
    ...base,
    hasMicrodata: true,
    hasCensusAuxiliaries: true,
    targetType: 'count',
  }
  const recs = recommend(avail)

  it('GLMM-count appears', () => expect(ids(recs)).toContain('glmm-count'))
  it('two-part / ZI model appears', () => expect(ids(recs)).toContain('two-part-zinfl'))
  it('GLMM-count ranks above two-part', () =>
    expect(rankOf(recs, 'glmm-count')).toBeLessThan(rankOf(recs, 'two-part-zinfl')))
  it('direct estimator ranks last', () => expect(recs[recs.length - 1].entry.id).toBe('direct'))
})

// ── Scenario 6: Outlier flag, continuous → M-quantile and REBLUP above EBLUP ──
describe('Scenario 6 — outlier flag with continuous target', () => {
  const avail: DataAvailability = {
    ...base,
    hasMicrodata: true,
    hasCensusAuxiliaries: true,
    targetType: 'continuous',
    likelyOutliers: true,
  }
  const recs = recommend(avail)

  it('M-quantile appears', () => expect(ids(recs)).toContain('m-quantile'))
  it('REBLUP appears', () => expect(ids(recs)).toContain('reblup'))
  it('BHF-EBLUP appears', () => expect(ids(recs)).toContain('bhf-eblup'))
  it('M-quantile ranks above BHF-EBLUP', () =>
    expect(rankOf(recs, 'm-quantile')).toBeLessThan(rankOf(recs, 'bhf-eblup')))
  it('REBLUP ranks above BHF-EBLUP', () =>
    expect(rankOf(recs, 'reblup')).toBeLessThan(rankOf(recs, 'bhf-eblup')))
  it('direct estimator ranks last', () => expect(recs[recs.length - 1].entry.id).toBe('direct'))
  it('BHF-EBLUP has an outlier caveat', () => {
    const bhf = recs.find(r => r.entry.id === 'bhf-eblup')!
    expect(bhf.caveats.some(c => c.toLowerCase().includes('outlier'))).toBe(true)
  })
})

// ── Scenario 7: Spatial flag → Spatial-FH present and ranked above FH ──────────
describe('Scenario 7 — spatial flag, area aggregates available', () => {
  const avail: DataAvailability = {
    ...base,
    hasAreaAggregates: true,
    hasCensusAuxiliaries: true,
    hasContiguityMatrix: true,
    targetType: 'continuous',
    likelySpatialCorrelation: true,
  }
  const recs = recommend(avail)

  it('Spatial-FH is present', () => expect(ids(recs)).toContain('spatial-fh'))
  it('FH-EBLUP is present', () => expect(ids(recs)).toContain('fh-eblup'))
  it('Spatial-FH ranks above FH-EBLUP', () =>
    expect(rankOf(recs, 'spatial-fh')).toBeLessThan(rankOf(recs, 'fh-eblup')))
  it('direct estimator ranks last', () => expect(recs[recs.length - 1].entry.id).toBe('direct'))
})

// ── Scenario 8: No microdata, no area aggregates → only direct returned ─────────
describe('Scenario 8 — no data available', () => {
  const avail: DataAvailability = { ...base }
  const recs = recommend(avail)

  it('returns exactly one recommendation', () => expect(recs).toHaveLength(1))
  it('the only result is direct', () => expect(recs[0].entry.id).toBe('direct'))
  it('direct has a degraded caveat', () =>
    expect(recs[0].caveats.some(c => c.toLowerCase().includes('unavailable'))).toBe(true))
})

// ── Scenario 9: Out-of-sample areas → EBP preferred; OOS caveats present ───────
describe('Scenario 9 — out-of-sample areas flag', () => {
  const avail: DataAvailability = {
    ...base,
    hasMicrodata: true,
    hasCensusAuxiliaries: true,
    hasOutOfSampleAreas: true,
    targetType: 'continuous',
  }
  const recs = recommend(avail)

  it('EBP/CensusEB ranks first', () => expect(recs[0].entry.id).toBe('ebp-censuseb'))
  it('every result has an OOS caveat', () =>
    recs.forEach(r =>
      expect(r.caveats.some(c => c.toLowerCase().includes('out-of-sample'))).toBe(true)
    ))
  it('direct estimator ranks last', () => expect(recs[recs.length - 1].entry.id).toBe('direct'))
})

// ── Scenario 10: Weights present → GREG appears ─────────────────────────────────
describe('Scenario 10 — survey weights available', () => {
  const avail: DataAvailability = {
    ...base,
    hasMicrodata: true,
    hasWeights: true,
    hasCensusAuxiliaries: true,
    targetType: 'continuous',
  }
  const recs = recommend(avail)

  it('GREG appears in results', () => expect(ids(recs)).toContain('greg'))
  it('direct estimator ranks last', () => expect(recs[recs.length - 1].entry.id).toBe('direct'))
})

// ── Scenario 11: Method needing Stata v17 carries stataV14Warning ──────────────
describe('Scenario 11 — Stata v14 warning for high-version methods', () => {
  const avail: DataAvailability = {
    ...base,
    hasMicrodata: true,
    hasWeights: true,
    hasCensusAuxiliaries: true,
    targetType: 'poverty',
  }
  const recs = recommend(avail)

  it('EBP/CensusEB (stataMinVersion 17) carries stataV14Warning', () => {
    const ebp = recs.find(r => r.entry.id === 'ebp-censuseb')!
    expect(ebp.stataV14Warning).toBe(true)
  })
  it('ELL (stataMinVersion 17) carries stataV14Warning', () => {
    const ell = recs.find(r => r.entry.id === 'ell')!
    expect(ell.stataV14Warning).toBe(true)
  })
  it('methods with stataMinVersion 14 do not carry stataV14Warning', () => {
    recs
      .filter(r => r.entry.stataMinVersion <= 14)
      .forEach(r => expect(r.stataV14Warning).toBe(false))
  })
})

// ── Scenario 12: All results have non-empty whyApplicable ──────────────────────
describe('Scenario 12 — whyApplicable always non-empty', () => {
  const scenarios: DataAvailability[] = [
    { ...base, hasAreaAggregates: true, hasCensusAuxiliaries: true },
    { ...base, hasMicrodata: true, hasCensusAuxiliaries: true },
    { ...base, hasMicrodata: true, hasWeights: true, hasCensusAuxiliaries: true, targetType: 'poverty' },
    { ...base, hasMicrodata: true, hasCensusAuxiliaries: true, targetType: 'binary' },
    { ...base, hasMicrodata: true, hasCensusAuxiliaries: true, targetType: 'count' },
    { ...base, hasMicrodata: true, hasCensusAuxiliaries: true, likelyOutliers: true },
  ]

  scenarios.forEach((avail, i) => {
    it(`Scenario ${i + 1}: every recommendation has a non-empty whyApplicable`, () => {
      const recs = recommend(avail)
      recs.forEach(r =>
        expect(r.whyApplicable.trim().length, `${r.entry.id} has empty whyApplicable`).toBeGreaterThan(0)
      )
    })
  })
})

// ── Scenario 13: Spatial flag with microdata → spatial method ranks above non-spatial
describe('Scenario 13 — spatial flag with microdata and coordinates', () => {
  const avail: DataAvailability = {
    ...base,
    hasMicrodata: true,
    hasAreaAggregates: true,
    hasCensusAuxiliaries: true,
    hasContiguityMatrix: true,
    hasCoordinates: true,
    targetType: 'continuous',
    likelySpatialCorrelation: true,
  }
  const recs = recommend(avail)

  it('a spatial method appears', () =>
    expect(recs.some(r => r.entry.spatial)).toBe(true))
  it('spatial method ranks above BHF-EBLUP (non-spatial)', () => {
    const bestSpatial = recs.find(r => r.entry.spatial)!
    expect(bestSpatial.rank).toBeLessThan(rankOf(recs, 'bhf-eblup'))
  })
  it('direct estimator ranks last', () => expect(recs[recs.length - 1].entry.id).toBe('direct'))
})

// ── Scenario 14: Outliers + spatial + coordinates → MQGWR ranks first ──────────
describe('Scenario 14 — outliers and spatial correlation with coordinates', () => {
  const avail: DataAvailability = {
    ...base,
    hasMicrodata: true,
    hasCensusAuxiliaries: true,
    hasCoordinates: true,
    targetType: 'continuous',
    likelyOutliers: true,
    likelySpatialCorrelation: true,
  }
  const recs = recommend(avail)

  it('MQGWR ranks first', () => expect(recs[0].entry.id).toBe('mqgwr'))
  it('M-quantile is present', () => expect(ids(recs)).toContain('m-quantile'))
  it('REBLUP is present', () => expect(ids(recs)).toContain('reblup'))
  it('direct estimator ranks last', () => expect(recs[recs.length - 1].entry.id).toBe('direct'))
})

// ── Scenario 15: recommend() is pure — same inputs always produce same output ──
describe('Scenario 15 — purity and determinism', () => {
  const avail: DataAvailability = {
    ...base,
    hasMicrodata: true,
    hasCensusAuxiliaries: true,
    targetType: 'continuous',
    likelyOutliers: true,
  }

  it('two calls with identical inputs return identical results', () => {
    const a = recommend(avail)
    const b = recommend(avail)
    expect(ids(a)).toEqual(ids(b))
    expect(a.map(r => r.rank)).toEqual(b.map(r => r.rank))
  })
})

// ── Scenario 16: Sample-based auxiliaries with variances → FH-ME first ─────────
describe('Scenario 16 — sample auxiliaries, variances available', () => {
  const avail: DataAvailability = {
    ...base,
    hasAreaAggregates: true,
    hasCensusAuxiliaries: true,
    targetType: 'continuous',
    auxiliaryFromSample: true,
    hasAuxiliaryVariances: true,
  }
  const recs = recommend(avail)

  it('FH-ME is present', () => expect(ids(recs)).toContain('fh-me'))
  it('FH-ME ranks first', () => expect(recs[0].entry.id).toBe('fh-me'))
  it('FH-ME ranks above standard FH-EBLUP', () =>
    expect(rankOf(recs, 'fh-me')).toBeLessThan(rankOf(recs, 'fh-eblup')))
  it('standard FH-EBLUP carries the sampling-error caveat', () => {
    const fh = recs.find(r => r.entry.id === 'fh-eblup')!
    expect(fh.caveats.some(c => c.includes('come from a sample'))).toBe(true)
  })
  it('FH-ME does NOT carry the blocking caveat (variances available)', () => {
    const fhMe = recs.find(r => r.entry.id === 'fh-me')!
    expect(fhMe.caveats.some(c => c.includes('provide the variance columns'))).toBe(false)
  })
  it('direct estimator ranks last', () => expect(recs[recs.length - 1].entry.id).toBe('direct'))
})

// ── Scenario 17: Sample-based auxiliaries, variances missing → blocking caveat ──
describe('Scenario 17 — sample auxiliaries, variances missing', () => {
  const avail: DataAvailability = {
    ...base,
    hasAreaAggregates: true,
    hasCensusAuxiliaries: true,
    targetType: 'proportion',
    auxiliaryFromSample: true,
    hasAuxiliaryVariances: false,
  }
  const recs = recommend(avail)

  it('FH-ME is present', () => expect(ids(recs)).toContain('fh-me'))
  it('FH-ME carries the blocking caveat', () => {
    const fhMe = recs.find(r => r.entry.id === 'fh-me')!
    expect(fhMe.caveats.some(c => c.includes('provide the variance columns'))).toBe(true)
  })
  it('standard FH-EBLUP still carries the sampling-error caveat', () => {
    const fh = recs.find(r => r.entry.id === 'fh-eblup')!
    expect(fh.caveats.some(c => c.includes('come from a sample'))).toBe(true)
  })
})

// ── Scenario 18: Register auxiliaries → no change, FH-ME hidden ─────────────────
describe('Scenario 18 — register auxiliaries (known exactly)', () => {
  const avail: DataAvailability = {
    ...base,
    hasAreaAggregates: true,
    hasCensusAuxiliaries: true,
    targetType: 'continuous',
    auxiliaryFromSample: false,
    hasAuxiliaryVariances: false,
  }
  const recs = recommend(avail)

  it('FH-ME is NOT present', () => expect(ids(recs)).not.toContain('fh-me'))
  it('FH-EBLUP ranks first (unchanged behaviour)', () => expect(recs[0].entry.id).toBe('fh-eblup'))
  it('FH-EBLUP carries no sampling-error caveat', () => {
    const fh = recs.find(r => r.entry.id === 'fh-eblup')!
    expect(fh.caveats.some(c => c.includes('come from a sample'))).toBe(false)
  })
  it('direct estimator ranks last', () => expect(recs[recs.length - 1].entry.id).toBe('direct'))
})
