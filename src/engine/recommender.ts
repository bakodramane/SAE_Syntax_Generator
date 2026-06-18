import type { CatalogueEntry, DataAvailability } from '../types/index.js'
import { catalogue } from '../catalogue/index.js'

export interface Recommendation {
  entry: CatalogueEntry
  rank: number
  whyApplicable: string
  caveats: string[]
  stataV14Warning: boolean
}

const DIRECT_ID = 'direct'
const FH_ME_ID = 'fh-me'

// Standard area-level methods that assume the auxiliary variables are known exactly.
// When the user declares sample-based auxiliaries, these carry a sampling-error caveat.
const KNOWN_COVARIATE_AREA_METHODS = ['fh-eblup', 'spatial-fh', 'robust-fh']

const SAMPLE_AUX_CAVEAT =
  'Your auxiliary variables come from a sample and carry sampling error. This method ' +
  'assumes they are known exactly, which can bias the estimates and understate their ' +
  'uncertainty. Prefer the measurement-error model (FH-ME) unless the auxiliary sample ' +
  'is very large.'

const FH_ME_BLOCKING_CAVEAT =
  'The measurement-error correction needs the sampling variances of your auxiliary ' +
  'estimates. Without them this method cannot be applied — provide the variance columns, ' +
  'or treat the auxiliaries as approximate and interpret results with caution.'

// ── Eligibility ────────────────────────────────────────────────────────────────

function isEligible(entry: CatalogueEntry, availability: DataAvailability): boolean {
  // Direct estimator is always included as a benchmark, even when inputs are missing.
  if (entry.id === DIRECT_ID) return true

  const req = entry.requiredInputs

  // Target type must be supported (skip check when target is unknown).
  if (
    availability.targetType !== 'unknown' &&
    !entry.targetTypes.includes(availability.targetType)
  ) {
    return false
  }

  if (req.microdata && !availability.hasMicrodata) return false
  if (req.areaAggregates && !availability.hasAreaAggregates) return false
  if (req.weights && !availability.hasWeights) return false
  if (req.contiguityMatrix && !availability.hasContiguityMatrix) return false
  if (req.coordinates && !availability.hasCoordinates) return false
  if (req.censusAuxiliaries !== 'none' && !availability.hasCensusAuxiliaries) return false

  // Measurement-error methods only make sense when auxiliaries come from a sample.
  // Hide them entirely when the user has register/census auxiliaries known exactly.
  if (entry.requiresAuxiliaryVariances && !availability.auxiliaryFromSample) return false

  return true
}

// ── Priority scoring ───────────────────────────────────────────────────────────
// Lower score = higher rank. Direct is always 9999 (last).

function computeScore(entry: CatalogueEntry, availability: DataAvailability): number {
  const { id } = entry
  const {
    targetType,
    hasMicrodata,
    hasAreaAggregates,
    hasWeights,
    hasCensusAuxiliaries,
    hasContiguityMatrix,
    hasCoordinates,
    hasOutOfSampleAreas,
    likelyOutliers,
    likelySpatialCorrelation,
  } = availability

  if (id === DIRECT_ID) return 9999

  // ── Sample-based auxiliaries ──────────────────────────────────────────────────
  // When the auxiliaries carry sampling error, the measurement-error Fay–Herriot
  // model ranks first for area-level continuous or proportion targets.
  if (
    availability.auxiliaryFromSample &&
    id === FH_ME_ID &&
    (targetType === 'continuous' || targetType === 'proportion' || targetType === 'unknown')
  ) {
    return 5
  }

  // ── Poverty target ──────────────────────────────────────────────────────────
  if (targetType === 'poverty') {
    if (id === 'ebp-censuseb') return 10
    if (id === 'ell') return 20
    return 500
  }

  // ── Binary / Proportion target ──────────────────────────────────────────────
  if (targetType === 'binary' || targetType === 'proportion') {
    if (hasMicrodata) {
      if (id === 'glmm-binary') return 10
      if (id === 'hb-unit') return 20
      if (id === 'fh-eblup') return 30
      if (id === 'hb-fh') return 40
    } else {
      if (id === 'fh-eblup') return 10
      if (id === 'hb-fh') return 20
    }
    return 500
  }

  // ── Count target ────────────────────────────────────────────────────────────
  if (targetType === 'count') {
    if (id === 'glmm-count') return 10
    if (id === 'two-part-zinfl') return 20
    if (id === 'hb-unit') return 30
    return 500
  }

  // ── Continuous (or unknown) target ──────────────────────────────────────────

  // Area aggregates only — no microdata
  if (!hasMicrodata) {
    const spatialActive = likelySpatialCorrelation && hasContiguityMatrix
    if (spatialActive) {
      if (id === 'spatial-fh') return 10
      if (id === 'fh-eblup') return 20
      if (id === 'robust-fh') return likelyOutliers ? 22 : 35
      if (id === 'hb-fh') return 25
      return 500
    }
    if (likelyOutliers) {
      if (id === 'fh-eblup') return 10
      if (id === 'robust-fh') return 12
      if (id === 'hb-fh') return 20
      if (id === 'spatial-fh') return 30
      return 500
    }
    // Standard area-level
    if (id === 'fh-eblup') return 10
    if (id === 'hb-fh') return 20
    if (id === 'spatial-fh') return 30
    if (id === 'robust-fh') return 35
    return 500
  }

  // Microdata available

  // Outliers + Spatial
  if (likelyOutliers && likelySpatialCorrelation) {
    if (id === 'mqgwr' && hasCoordinates) return 10
    if (id === 'm-quantile') return 20
    if (id === 'reblup') return 30
    if (id === 'hb-unit') return 50
    if (id === 'bhf-eblup') return 200
    return 500
  }

  // Outliers only
  if (likelyOutliers) {
    if (id === 'm-quantile') return 10
    if (id === 'reblup') return 20
    if (id === 'mqgwr' && hasCoordinates) return 30
    if (id === 'hb-unit') return 50
    if (id === 'bhf-eblup') return 200
    return 500
  }

  // Spatial only
  if (likelySpatialCorrelation) {
    if (id === 'spatial-fh' && hasAreaAggregates) return 10
    if (id === 'mqgwr' && hasCoordinates) return 15
    if (id === 'bhf-eblup') return 20
    if (id === 'fh-eblup' && hasAreaAggregates) return 25
    if (id === 'm-quantile') return 30
    if (id === 'hb-unit') return 35
    return 500
  }

  // Out-of-sample areas (§3: EBP first, FH second)
  if (hasOutOfSampleAreas) {
    if (id === 'ebp-censuseb' && hasCensusAuxiliaries) return 10
    if (id === 'fh-eblup' && hasAreaAggregates) return 15
    if (id === 'bhf-eblup') return 20
    if (id === 'm-quantile') return 25
    if (id === 'reblup') return 30
    if (id === 'hb-unit') return 35
    if (id === 'greg' && hasWeights) return 40
    return 500
  }

  // Standard microdata + continuous (§3: BHF first, EBP second)
  if (id === 'bhf-eblup') return 10
  if (id === 'ebp-censuseb') return hasCensusAuxiliaries ? 15 : 500
  if (id === 'greg' && hasWeights) return 20
  if (id === 'm-quantile') return 25
  if (id === 'reblup') return 30
  if (id === 'hb-unit') return 35
  if (id === 'greg') return 40
  return 500
}

// ── Human-readable explanation ─────────────────────────────────────────────────

function buildWhyApplicable(entry: CatalogueEntry, availability: DataAvailability): string {
  const { id } = entry
  const {
    targetType,
    hasMicrodata,
    hasAreaAggregates,
    hasCensusAuxiliaries,
    likelyOutliers,
    likelySpatialCorrelation,
    hasOutOfSampleAreas,
    hasContiguityMatrix,
    hasCoordinates,
    hasWeights,
  } = availability

  if (id === DIRECT_ID) {
    return 'Use as a benchmark to validate model-based estimates against the raw survey data.'
  }

  if (id === FH_ME_ID) {
    return availability.auxiliaryFromSample
      ? 'Ranked first because your auxiliary variables come from a sample: this measurement-error Fay–Herriot model corrects for the sampling error they carry, leaning more on the direct estimate where the auxiliaries are noisier.'
      : 'Measurement-error Fay–Herriot model for auxiliary variables that come from a sample rather than a full census or register.'
  }

  // Poverty-specific explanations
  if (targetType === 'poverty') {
    if (id === 'ebp-censuseb') {
      return 'Best-practice method for poverty mapping: simulates welfare distributions onto census microdata to estimate non-linear poverty and inequality indicators (headcount, gap, Gini).'
    }
    if (id === 'ell') {
      return 'Alternative poverty-mapping method that decomposes residuals into location and household components; suitable when EBP normality assumptions are harder to satisfy.'
    }
  }

  // Binary / proportion
  if (targetType === 'binary' || targetType === 'proportion') {
    if (id === 'glmm-binary') {
      return 'Correctly models binary or proportion outcomes using a logistic random-intercept model on your survey microdata; respects the [0,1] range of proportions.'
    }
    if (id === 'hb-unit') {
      return 'Bayesian unit-level model providing exact posterior distributions for binary/proportion targets, especially valuable when area sample sizes are very small.'
    }
    if (id === 'fh-eblup') {
      return hasMicrodata
        ? 'Area-level Fay–Herriot model using your pre-computed direct estimates; works alongside your microdata for a design-consistent comparison.'
        : 'Standard area-level method combining direct estimates with auxiliary regression; no microdata required and compatible with Stata 14+.'
    }
    if (id === 'hb-fh') {
      return 'Bayesian Fay–Herriot model providing exact small-sample inference for binary/proportion targets; no microdata required.'
    }
  }

  // Count
  if (targetType === 'count') {
    if (id === 'glmm-count') {
      return 'Correctly models count outcomes using a Poisson mixed model; captures between-area heterogeneity beyond the Poisson mean.'
    }
    if (id === 'two-part-zinfl') {
      return 'Two-part model for count data with excess zeros: a separate model for whether an outcome occurs and for its magnitude when non-zero.'
    }
    if (id === 'hb-unit') {
      return 'Bayesian unit-level Poisson model providing exact posterior distributions for count outcomes; suited to sparse data with very small area samples.'
    }
  }

  // Area aggregates only (no microdata)
  if (!hasMicrodata && hasAreaAggregates) {
    const spatialActive = likelySpatialCorrelation && hasContiguityMatrix
    if (id === 'spatial-fh') {
      return spatialActive
        ? 'Extends Fay–Herriot with a spatial autoregressive (SAR) model for area random effects; ranked first because spatial correlation is indicated and a contiguity matrix is available.'
        : 'Spatial Fay–Herriot model; eligible because a contiguity matrix is available — consider promoting to rank 1 if spatial correlation is confirmed.'
    }
    if (id === 'fh-eblup') {
      return spatialActive
        ? 'Standard Fay–Herriot model; spatial correlation is indicated, so Spatial-FH is preferred above, but FH remains a useful non-spatial baseline.'
        : 'Standard area-level SAE method combining direct estimates with auxiliary regression; the canonical starting point when only area-level data are available.'
    }
    if (id === 'robust-fh') {
      return likelyOutliers
        ? 'Robustified Fay–Herriot that downweights outlying areas; ranked highly because you indicated likely outliers in the direct estimates.'
        : 'Robustified Fay–Herriot; ranked below standard FH here, but useful if diagnostic plots reveal influential area observations.'
    }
    if (id === 'hb-fh') {
      return 'Bayesian Fay–Herriot model providing exact small-sample inference; no microdata required — particularly suited when areas have very small sample sizes (ni < 5).'
    }
  }

  // Microdata available
  if (hasMicrodata) {
    if (likelyOutliers && likelySpatialCorrelation) {
      if (id === 'mqgwr' && hasCoordinates) {
        return 'Geographically weighted M-quantile regression handles both outliers and spatial non-stationarity simultaneously; ranked first because both flags are set and coordinates are available.'
      }
      if (id === 'm-quantile') {
        return 'Robust M-quantile estimator that handles outliers without strong distributional assumptions; consider MQGWR if coordinates are available for full spatial adjustment.'
      }
      if (id === 'reblup') {
        return 'Robust EBLUP using Huber influence functions to downweight outlying units; mixed-model framework alternative to M-quantile.'
      }
    }

    if (likelyOutliers) {
      if (id === 'm-quantile') {
        return 'Robust, distribution-free estimator using M-quantile regression; ranked first because you indicated likely outliers in the survey data.'
      }
      if (id === 'reblup') {
        return 'Robust EBLUP using Huber influence functions; ranked highly because outliers are indicated — downweights influential units within a mixed-model framework.'
      }
      if (id === 'mqgwr' && hasCoordinates) {
        return 'M-quantile GWR adds spatial non-stationarity to robust estimation; available because coordinates are present, though spatial correlation was not flagged.'
      }
      if (id === 'bhf-eblup') {
        return 'Standard BHF EBLUP included for reference; caution — outliers are indicated, and M-quantile or REBLUP are more appropriate alternatives.'
      }
    }

    if (likelySpatialCorrelation) {
      if (id === 'spatial-fh' && hasAreaAggregates) {
        return 'Spatial Fay–Herriot borrows strength from neighbouring areas; ranked first for the spatial scenario because area-level data and a contiguity matrix are both available.'
      }
      if (id === 'mqgwr' && hasCoordinates) {
        return 'M-quantile GWR handles spatial non-stationarity using a distance-weighted local regression; ranked because spatial correlation is indicated and coordinates are available.'
      }
      if (id === 'bhf-eblup') {
        return 'Standard unit-level EBLUP; spatial correlation is indicated — consider Spatial-FH or MQGWR if the spatial structure is important.'
      }
      if (id === 'fh-eblup' && hasAreaAggregates) {
        return 'Standard Fay–Herriot included as a non-spatial baseline; Spatial-FH is preferred when spatial correlation is indicated.'
      }
      if (id === 'm-quantile') {
        return 'M-quantile estimator; spatial correlation is indicated, but spatial extensions (MQGWR) are preferred if coordinates are available.'
      }
      if (id === 'hb-unit') {
        return 'Bayesian unit-level model; spatial correlation is indicated — consider extending to a spatial HB model if available in your software.'
      }
    }

    if (hasOutOfSampleAreas) {
      if (id === 'ebp-censuseb') {
        return 'EBP/CensusEB ranked first because you have out-of-sample areas and census microdata; out-of-sample areas are predicted via a synthetic predictor using the fitted model.'
      }
      if (id === 'fh-eblup' && hasAreaAggregates) {
        return 'Fay–Herriot provides synthetic predictions for out-of-sample areas using fixed-effect predictions; a good area-level fallback when microdata coverage is incomplete.'
      }
      if (id === 'bhf-eblup') {
        return 'BHF EBLUP handles out-of-sample areas via a synthetic predictor (fixed effects only); population means of auxiliaries are required for all target areas.'
      }
    }

    // Standard microdata + continuous
    if (id === 'bhf-eblup') {
      return 'Standard unit-level EBLUP combining individual survey records with census population means; the canonical first choice for continuous microdata with area auxiliaries.'
    }
    if (id === 'ebp-censuseb') {
      return hasCensusAuxiliaries
        ? 'Empirical Best Predictor using census microdata; can estimate non-linear indicators and handles out-of-sample areas, making it a strong alternative to BHF.'
        : 'EBP/CensusEB requires unit-level census microdata, which is not indicated as available.'
    }
    if (id === 'greg' && hasWeights) {
      return 'GREG estimator uses your survey weights for design-consistent estimation, calibrated against known area-level population totals; included because weights are available.'
    }
    if (id === 'greg') {
      return 'GREG estimator provides design-consistent estimates calibrated against population totals; requires survey weights.'
    }
    if (id === 'm-quantile') {
      return 'Robust M-quantile estimator; a useful alternative or robustness check when distributional assumptions of the standard EBLUP may be questionable.'
    }
    if (id === 'reblup') {
      return 'Robust EBLUP using Huber influence functions; preferred over M-quantile when a mixed-model framework is desired and robustness to unit-level outliers is needed.'
    }
    if (id === 'hb-unit') {
      return 'Bayesian unit-level model providing exact posterior inference; particularly suited to very small area sample sizes or when probability statements about estimates are needed.'
    }
  }

  return entry.whyChooseThis
}

// ── Caveats ────────────────────────────────────────────────────────────────────

function buildCaveats(entry: CatalogueEntry, availability: DataAvailability): string[] {
  const caveats: string[] = [...(entry.caveats ?? [])]
  const { likelyOutliers, likelySpatialCorrelation, hasOutOfSampleAreas } = availability

  // Sample-based auxiliaries: warn the standard known-covariate area-level methods,
  // and block FH-ME itself if the required auxiliary variances are not available.
  if (availability.auxiliaryFromSample) {
    if (KNOWN_COVARIATE_AREA_METHODS.includes(entry.id)) {
      caveats.push(SAMPLE_AUX_CAVEAT)
    }
    if (entry.id === FH_ME_ID && !availability.hasAuxiliaryVariances) {
      caveats.push(FH_ME_BLOCKING_CAVEAT)
    }
  }

  // Outlier warning for non-robust methods
  if (likelyOutliers && !entry.robust && entry.id !== DIRECT_ID) {
    caveats.push(
      'You indicated likely outliers — M-quantile or REBLUP are more robust alternatives.'
    )
  }

  // Spatial warning for non-spatial methods
  if (likelySpatialCorrelation && !entry.spatial && entry.id !== DIRECT_ID) {
    caveats.push(
      'You indicated likely spatial correlation — Spatial Fay–Herriot or MQGWR model this explicitly.'
    )
  }

  // Out-of-sample caveat
  if (hasOutOfSampleAreas) {
    caveats.push(
      'Out-of-sample areas: estimates rely on a synthetic predictor (fixed effects only); model assumptions are especially critical for these areas.'
    )
  }

  // Unit-level census requirement
  if (entry.requiredInputs.censusAuxiliaries === 'unit') {
    caveats.push(
      'Requires unit-level (individual record) census microdata — area-level population means alone are not sufficient.'
    )
  }

  // Stata version caveat
  if (entry.stataMinVersion > 14) {
    caveats.push(
      `Stata implementation requires v${entry.stataMinVersion}+. For Stata 14, use the R script or the fallback command shown in the .do file.`
    )
  }

  // Direct estimator degraded warning
  if (entry.id === DIRECT_ID && (!availability.hasMicrodata || !availability.hasWeights)) {
    caveats.push(
      'Survey microdata and/or sampling weights are unavailable; direct estimation cannot be computed in the standard sense.'
    )
  }

  return caveats
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function recommend(availability: DataAvailability): Recommendation[] {
  const eligible = catalogue.filter(entry => isEligible(entry, availability))

  const scored = eligible.map(entry => ({
    entry,
    score: computeScore(entry, availability),
  }))

  scored.sort((a, b) => a.score - b.score)

  return scored.map((item, index) => ({
    entry: item.entry,
    rank: index + 1,
    whyApplicable: buildWhyApplicable(item.entry, availability),
    caveats: buildCaveats(item.entry, availability),
    stataV14Warning: item.entry.stataMinVersion > 14,
  }))
}
