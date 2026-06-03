import type { CatalogueEntry } from '../types/index.js'
import { catalogue } from '../catalogue/index.js'
import { generateCode } from '../engine/codegen.js'
import type { UserInputs } from '../engine/codegen.js'
import { useWizard } from './WizardContext.js'

function isROnly(entry: CatalogueEntry): boolean {
  return entry.stataCommand.startsWith('(no')
}

function download(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function buildInputs(state: ReturnType<typeof useWizard>['state']): UserInputs {
  const targetVar = state.variables.find(v => v.role === 'target')?.name ?? ''
  const areaIdVar = state.variables.find(v => v.role === 'area-id')?.name ?? ''
  const auxiliaryVars = state.variables.filter(v => v.role === 'auxiliary').map(v => v.name)
  const weightVar = state.variables.find(v => v.role === 'weight')?.name
  const directEstVar = state.variables.find(v => v.role === 'direct-est')?.name
  const directVarVar = state.variables.find(v => v.role === 'direct-var')?.name

  return {
    targetVar,
    areaIdVar,
    auxiliaryVars,
    weightVar,
    directEstVar,
    directVarVar,
    surveyDataPath: state.surveyDataPath,
    censusDataPath: state.censusDataPath,
    areaDataPath: state.areaDataPath,
    stataVersion: state.stataVersion,
    nSimulations: state.nSimulations,
    mseMethod: state.mseMethod,
  }
}

function CodeBlock({ code, label }: { code: string; label: string }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</div>
      <pre className="bg-gray-900 text-gray-100 text-xs p-4 rounded-lg overflow-x-auto overflow-y-auto max-h-64 leading-relaxed whitespace-pre font-mono">
        {code}
      </pre>
    </div>
  )
}

function ScriptSection({ entry }: { entry: CatalogueEntry }) {
  const { state, dispatch } = useWizard()
  const inputs = buildInputs(state)
  const code = generateCode(entry, inputs)
  const rOnly = isROnly(entry)
  const slug = entry.id

  const needsOOS = entry.id === 'ebp-censuseb' || entry.id === 'ell'

  return (
    <div className="space-y-4 border border-gray-200 rounded-lg p-4">
      <h3 className="font-semibold text-gray-900">{entry.displayName}</h3>

      {/* Overrides */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1" htmlFor={`survey-path-${slug}`}>Survey data path</label>
            <input
              id={`survey-path-${slug}`}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              value={state.surveyDataPath}
              onChange={e => dispatch({ type: 'SET_SURVEY_PATH', payload: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1" htmlFor={`census-path-${slug}`}>
              Census data path <span className="text-gray-400">(unit-level; EBP, BHF, ELL)</span>
            </label>
            <input
              id={`census-path-${slug}`}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              value={state.censusDataPath}
              onChange={e => dispatch({ type: 'SET_CENSUS_PATH', payload: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1" htmlFor={`area-path-${slug}`}>
              Area-level data path <span className="text-gray-400">(direct estimates; FH, GREG)</span>
            </label>
            <input
              id={`area-path-${slug}`}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              value={state.areaDataPath}
              onChange={e => dispatch({ type: 'SET_AREA_PATH', payload: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-3">
          {needsOOS && (
            <div>
              <label className="block text-xs text-gray-600 mb-1" htmlFor={`nsim-${slug}`}>
                Bootstrap replications (N)
              </label>
              <input
                id={`nsim-${slug}`}
                type="number"
                min={50}
                max={5000}
                step={50}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                value={state.nSimulations}
                onChange={e => dispatch({ type: 'SET_N_SIM', payload: Number(e.target.value) })}
              />
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-600 mb-1" htmlFor={`mse-${slug}`}>MSE estimation method</label>
            <select
              id={`mse-${slug}`}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              value={state.mseMethod}
              onChange={e => dispatch({ type: 'SET_MSE_METHOD', payload: e.target.value as 'analytic' | 'bootstrap' })}
            >
              <option value="bootstrap">Bootstrap</option>
              <option value="analytic">Analytic (Prasad–Rao)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Fallback banner */}
      {code.usedFallback && (
        <div role="alert" className="bg-yellow-50 border border-yellow-300 rounded p-3 text-sm text-yellow-800">
          <strong>Stata version notice:</strong> Your Stata version ({state.stataVersion}) does not
          support {entry.displayName} natively. The .do file uses the base{' '}
          <code className="bg-yellow-100 px-1 rounded">mixed</code> command instead.
          Use the R script for the full implementation. {code.fallbackNote}
        </div>
      )}

      {/* Script previews */}
      <CodeBlock code={code.r} label="R script (.R)" />
      <CodeBlock code={code.stata} label="Stata script (.do)" />

      {/* Download buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => download(code.r, `${slug}.R`)}
          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 font-medium"
          data-testid={`download-r-${slug}`}
        >
          Download R script (.R)
        </button>

        {rOnly ? (
          <p className="text-sm text-gray-500 italic self-center">
            No Stata implementation available — this method requires R.
          </p>
        ) : (
          <button
            type="button"
            onClick={() => download(code.stata, `${slug}.do`)}
            className="px-4 py-2 bg-gray-700 text-white text-sm rounded hover:bg-gray-800 font-medium"
            data-testid={`download-stata-${slug}`}
          >
            Download Stata script (.do)
          </button>
        )}
      </div>
    </div>
  )
}

export function Step5Generate() {
  const { state } = useWizard()
  const { selectedMethodId, comparisonMethodId, variables } = state

  const selectedEntry = catalogue.find(e => e.id === selectedMethodId)
  const comparisonEntry = catalogue.find(e => e.id === comparisonMethodId)

  const targetVar  = variables.find(v => v.role === 'target')
  const areaIdVar  = variables.find(v => v.role === 'area-id')
  const auxVars    = variables.filter(v => v.role === 'auxiliary')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Step 5 — Download scripts</h2>
        <p className="mt-1 text-sm text-gray-600">
          Review the generated scripts, adjust paths if needed, then download.
        </p>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm space-y-1">
        <p><span className="font-medium">Target variable:</span> <code className="bg-white border rounded px-1">{targetVar?.name ?? '—'}</code></p>
        <p><span className="font-medium">Area identifier:</span> <code className="bg-white border rounded px-1">{areaIdVar?.name ?? '—'}</code></p>
        <p><span className="font-medium">Auxiliary variables:</span>{' '}
          {auxVars.map(v => <code key={v.name} className="bg-white border rounded px-1 mr-1">{v.name}</code>)}
        </p>
        <p><span className="font-medium">Stata version:</span> {state.stataVersion}</p>
      </div>

      {selectedEntry && <ScriptSection entry={selectedEntry} />}
      {comparisonEntry && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Comparison method</h3>
          <ScriptSection entry={comparisonEntry} />
        </div>
      )}
    </div>
  )
}
