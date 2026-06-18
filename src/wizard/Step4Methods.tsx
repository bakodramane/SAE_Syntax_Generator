import { useState } from 'react'
import type { CatalogueEntry } from '../types/index.js'
import { recommend } from '../engine/recommender.js'
import type { Recommendation } from '../engine/recommender.js'
import { useWizard } from './WizardContext.js'

function isROnly(entry: CatalogueEntry): boolean {
  return entry.stataCommand.startsWith('(no')
}

function LevelBadge({ entry }: { entry: CatalogueEntry }) {
  const map: Record<string, string> = {
    area: 'bg-blue-100 text-blue-800',
    unit: 'bg-green-100 text-green-800',
    'model-assisted': 'bg-purple-100 text-purple-800',
  }
  const label: Record<string, string> = {
    area: 'Area-level',
    unit: 'Unit-level',
    'model-assisted': 'Model-assisted',
  }
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${map[entry.level]}`}>
      {label[entry.level]}
    </span>
  )
}

function MethodBadges({ rec }: { rec: Recommendation }) {
  const { entry } = rec
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      <LevelBadge entry={entry} />
      {entry.inferenceType === 'bayesian' && (
        <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
          Bayesian
        </span>
      )}
      {entry.robust && (
        <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
          Robust
        </span>
      )}
      {entry.spatial && (
        <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
          Spatial
        </span>
      )}
      {entry.requiresAuxiliaryVariances && (
        <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
          Accounts for sampling error in auxiliaries
        </span>
      )}
      {isROnly(entry) && (
        <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
          R only
        </span>
      )}
      {rec.stataV14Warning && !isROnly(entry) && (
        <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
          ⚠ Stata v14 workaround
        </span>
      )}
    </div>
  )
}

function MethodCard({ rec, selected, comparison, onSelect, onToggleComparison }: {
  rec: Recommendation
  selected: boolean
  comparison: boolean
  onSelect: () => void
  onToggleComparison: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const { entry } = rec

  return (
    <div
      className={`border rounded-lg p-4 transition-colors ${
        selected
          ? 'border-indigo-500 bg-indigo-50 shadow-sm'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Rank badge */}
        <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 text-xs font-bold">
          {rec.rank}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-gray-900 text-sm leading-snug">{entry.displayName}</h3>
            <div className="flex items-center gap-2 shrink-0">
              <input
                type="radio"
                name="selected-method"
                checked={selected}
                onChange={onSelect}
                id={`select-${entry.id}`}
                className="accent-indigo-600"
                aria-label={`Select ${entry.displayName}`}
                data-testid={`select-${entry.id}`}
              />
            </div>
          </div>

          <MethodBadges rec={rec} />

          <p className="text-xs text-gray-600 mt-2 leading-relaxed">{rec.whyApplicable}</p>

          {/* Software info */}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
            <span>R: <code className="bg-gray-100 px-1 rounded">{entry.rPackage}</code></span>
            {!isROnly(entry) && (
              <span>Stata: <code className="bg-gray-100 px-1 rounded">{entry.stataCommand}</code></span>
            )}
            <span>MSE: {entry.mseMethod}</span>
          </div>

          {/* Prominent sampling-error caveats — shown as a visible amber note */}
          {(() => {
            const isProminent = (c: string) =>
              c.includes('come from a sample') || c.includes('provide the variance columns')
            const prominent = rec.caveats.filter(isProminent)
            const rest = rec.caveats.filter(c => !isProminent(c))
            return (
              <>
                {prominent.length > 0 && (
                  <div
                    role="alert"
                    className="mt-2 bg-amber-50 border border-amber-300 rounded p-2 space-y-1"
                    data-testid={`sampling-error-note-${entry.id}`}
                  >
                    {prominent.map((c, i) => (
                      <p key={i} className="text-xs text-amber-800 flex gap-1">
                        <span aria-hidden>⚠</span><span>{c}</span>
                      </p>
                    ))}
                  </div>
                )}
                {rest.length > 0 && (
                  <ul className="mt-2 space-y-0.5">
                    {rest.map((c, i) => (
                      <li key={i} className="text-xs text-amber-700 flex gap-1">
                        <span>•</span><span>{c}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )
          })()}

          {/* Why this method — expandable */}
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setExpanded(e => !e)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
              aria-expanded={expanded}
            >
              {expanded ? '▾' : '▸'} Why this method?
            </button>
            {expanded && (
              <div className="mt-2 p-3 bg-gray-50 rounded text-xs text-gray-700 space-y-2">
                <p>{entry.whyChooseThis}</p>
                <div>
                  <p className="font-medium mb-1">Assumptions:</p>
                  <ul className="space-y-0.5">
                    {entry.assumptions.map((a, i) => <li key={i}>• {a}</li>)}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Comparison checkbox — not shown for the direct estimator */}
          {entry.id !== 'direct' && (
            <label className="mt-2 flex items-center gap-2 cursor-pointer text-xs text-gray-500">
              <input
                type="checkbox"
                checked={comparison}
                onChange={onToggleComparison}
                disabled={selected}
                className="accent-indigo-600"
              />
              Also generate code for comparison
            </label>
          )}
        </div>
      </div>
    </div>
  )
}

export function Step4Methods() {
  const { state, dispatch } = useWizard()
  const recs = recommend(state.availability)

  function selectMethod(id: string) {
    dispatch({ type: 'SELECT_METHOD', payload: id })
    if (state.comparisonMethodId === id) {
      dispatch({ type: 'SELECT_COMPARISON', payload: null })
    }
  }

  function toggleComparison(id: string) {
    dispatch({
      type: 'SELECT_COMPARISON',
      payload: state.comparisonMethodId === id ? null : id,
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Step 4 — Recommended methods</h2>
        <p className="mt-1 text-sm text-gray-600">
          Methods are ranked by suitability for your data. Select one to generate code for, and
          optionally tick a second method to generate a comparison script.
        </p>
      </div>

      {recs.length === 0 ? (
        <p className="text-sm text-gray-500 italic">
          No methods matched your data description. Please go back and check your availability flags.
        </p>
      ) : (
        <div className="space-y-3">
          {recs.map(rec => (
            <MethodCard
              key={rec.entry.id}
              rec={rec}
              selected={state.selectedMethodId === rec.entry.id}
              comparison={state.comparisonMethodId === rec.entry.id}
              onSelect={() => selectMethod(rec.entry.id)}
              onToggleComparison={() => toggleComparison(rec.entry.id)}
            />
          ))}
        </div>
      )}

      {recs.length > 0 && !state.selectedMethodId && (
        <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
          Please select a method before continuing.
        </p>
      )}
    </div>
  )
}

