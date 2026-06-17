import type { DataAvailability } from '../types/index.js'
import { useWizard } from './WizardContext.js'
import { Tooltip, InfoIcon } from './Tooltip.js'

interface FlagConfig {
  key: keyof Omit<DataAvailability, 'targetType'>
  label: string
  tip: string
}

const FLAGS: FlagConfig[] = [
  {
    key: 'hasMicrodata',
    label: 'I have individual household/unit records (microdata)',
    tip: 'The survey dataset contains one row per household or person, with all variables recorded at the individual level.',
  },
  {
    key: 'hasAreaAggregates',
    label: 'I have area-level direct estimates and their sampling variances',
    tip: 'Pre-computed estimates for each small area (e.g. from the direct estimator) along with their estimated mean squared errors or variances.',
  },
  {
    key: 'hasWeights',
    label: 'My microdata includes sampling weights',
    tip: 'Each record has a weight variable that reflects the probability of being sampled. Required for design-consistent estimation.',
  },
  {
    key: 'hasCensusAuxiliaries',
    label: 'I have population-level auxiliary variables from a census or registry',
    tip: 'Covariates available for the entire population — either as individual census records (unit-level) or as area-level means/totals. Required for most model-based methods.',
  },
  {
    key: 'hasContiguityMatrix',
    label: 'I have a spatial contiguity or distance matrix for the areas',
    tip: 'A matrix describing which areas are neighbours or their distances apart. Required for spatially correlated models such as Spatial Fay–Herriot.',
  },
  {
    key: 'hasCoordinates',
    label: 'I have geographic coordinates (centroids or unit locations)',
    tip: 'Latitude/longitude values for each area centroid or survey unit. Required for geographically weighted methods (MQGWR).',
  },
  {
    key: 'hasOutOfSampleAreas',
    label: 'Some target areas have no sample observations (out-of-sample areas)',
    tip: 'Areas where the sample size is zero — no households were surveyed. Model-based methods can still produce estimates for these areas using a synthetic predictor.',
  },
  {
    key: 'likelyOutliers',
    label: 'I suspect there are outlying areas or unusual observations',
    tip: 'A few areas or units may have extreme values that could unduly influence model estimates. Robust methods (M-quantile, REBLUP) are preferred in this case.',
  },
  {
    key: 'likelySpatialCorrelation',
    label: 'Neighbouring areas are likely to have similar values (spatial correlation)',
    tip: 'Areas that are geographically close tend to share characteristics. Spatial models borrow additional strength from neighbours and can improve precision.',
  },
]

const TARGET_TYPES: { value: DataAvailability['targetType']; label: string }[] = [
  { value: 'continuous',  label: 'Continuous (e.g. income, expenditure, yield)' },
  { value: 'binary',      label: 'Binary — yes/no outcome (e.g. employed, food-insecure)' },
  { value: 'proportion',  label: 'Proportion / rate (e.g. school attendance rate)' },
  { value: 'count',       label: 'Count (e.g. number of events per household or area)' },
  { value: 'poverty',     label: 'Poverty or inequality indicator (e.g. headcount, Gini)' },
  { value: 'unknown',     label: 'I am not sure yet' },
]

export function Step3Availability() {
  const { state, dispatch } = useWizard()
  const { availability, stataVersion } = state

  function toggleFlag(key: keyof Omit<DataAvailability, 'targetType'>) {
    dispatch({
      type: 'SET_AVAILABILITY',
      payload: { ...availability, [key]: !availability[key] },
    })
  }

  function setTargetType(v: DataAvailability['targetType']) {
    dispatch({ type: 'SET_AVAILABILITY', payload: { ...availability, targetType: v } })
  }

  function setAuxiliaryFromSample(fromSample: boolean) {
    dispatch({
      type: 'SET_AVAILABILITY',
      payload: {
        ...availability,
        auxiliaryFromSample: fromSample,
        // Reset the follow-up answer when switching back to a register source.
        hasAuxiliaryVariances: fromSample ? availability.hasAuxiliaryVariances : false,
      },
    })
  }

  function setHasAuxiliaryVariances(has: boolean) {
    dispatch({
      type: 'SET_AVAILABILITY',
      payload: { ...availability, hasAuxiliaryVariances: has },
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Step 3 — Data availability</h2>
        <p className="mt-1 text-sm text-gray-600">
          Tick everything that describes your data situation. The recommender uses these flags
          to filter and rank appropriate methods.
        </p>
      </div>

      {/* Target type */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-gray-800">
          What kind of variable is your target?{' '}
          <Tooltip text="The type of the outcome variable you want to estimate. This is the most important filter for method selection.">
            <InfoIcon />
          </Tooltip>
        </legend>
        <div className="space-y-1.5 pl-1">
          {TARGET_TYPES.map(tt => (
            <label key={tt.value} className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name="targetType"
                value={tt.value}
                checked={availability.targetType === tt.value}
                onChange={() => setTargetType(tt.value)}
                className="mt-0.5 accent-indigo-600"
              />
              <span className="text-sm text-gray-700">{tt.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <hr className="border-gray-200" />

      {/* Boolean flags */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-gray-800">What data do you have available?</legend>
        {FLAGS.map(f => (
          <label key={f.key} className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={availability[f.key] as boolean}
              onChange={() => toggleFlag(f.key)}
              className="mt-0.5 accent-indigo-600 h-4 w-4"
            />
            <span className="text-sm text-gray-700 leading-snug flex items-start gap-1">
              {f.label}
              <Tooltip text={f.tip}>
                <InfoIcon />
              </Tooltip>
            </span>
          </label>
        ))}
      </fieldset>

      <hr className="border-gray-200" />

      {/* Auxiliary variable source */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-gray-800">
          Where do your auxiliary variables come from?{' '}
          <Tooltip text="If your auxiliary variables are themselves survey estimates, they carry sampling error. A standard Fay–Herriot model assumes they are known exactly, which can bias the results, so the recommender will prefer a measurement-error model instead.">
            <InfoIcon />
          </Tooltip>
        </legend>
        <div className="space-y-1.5 pl-1">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="radio"
              name="auxiliarySource"
              checked={!availability.auxiliaryFromSample}
              onChange={() => setAuxiliaryFromSample(false)}
              className="mt-0.5 accent-indigo-600"
            />
            <span className="text-sm text-gray-700">
              A full census or administrative register (known exactly)
            </span>
          </label>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="radio"
              name="auxiliarySource"
              checked={availability.auxiliaryFromSample}
              onChange={() => setAuxiliaryFromSample(true)}
              className="mt-0.5 accent-indigo-600"
              data-testid="aux-source-sample"
            />
            <span className="text-sm text-gray-700">
              A sample or large survey (estimated, with sampling error)
            </span>
          </label>
        </div>

        {/* Follow-up: only shown when auxiliaries come from a sample */}
        {availability.auxiliaryFromSample && (
          <div className="mt-2 ml-6 border-l-2 border-indigo-200 pl-4 py-1">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={availability.hasAuxiliaryVariances}
                onChange={e => setHasAuxiliaryVariances(e.target.checked)}
                className="mt-0.5 accent-indigo-600 h-4 w-4"
                data-testid="aux-has-variances"
              />
              <span className="text-sm text-gray-700 leading-snug flex items-start gap-1">
                Can you provide the sampling variance of each auxiliary estimate for each area?
                <Tooltip text="The measurement-error correction needs the sampling variance of each auxiliary estimate, area by area. Without these variances the measurement-error model cannot be applied.">
                  <InfoIcon />
                </Tooltip>
              </span>
            </label>
          </div>
        )}
      </fieldset>

      <hr className="border-gray-200" />

      {/* Stata version */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-gray-800" htmlFor="stata-version">
          Which version of Stata do you use?{' '}
          <Tooltip text="Some methods require Stata 17+ (e.g. the World Bank sae package). If you use Stata 14 or 15, the generator will produce a fallback script using base commands. Enter 0 if you only use R.">
            <InfoIcon />
          </Tooltip>
        </label>
        <input
          id="stata-version"
          type="number"
          min={0}
          max={99}
          value={stataVersion}
          onChange={e => dispatch({ type: 'SET_STATA_VERSION', payload: Number(e.target.value) })}
          className="w-24 border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          aria-label="Stata version number"
        />
        <p className="text-xs text-gray-500">Enter your Stata version number (e.g. 14, 16, 17). Enter 0 if you only use R.</p>
      </div>
    </div>
  )
}

