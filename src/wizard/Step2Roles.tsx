import { useEffect } from 'react'
import type { Variable, VariableRole, VariableType } from '../types/index.js'
import { useWizard } from './WizardContext.js'
import { Tooltip, InfoIcon } from './Tooltip.js'

const ROLES: { value: VariableRole; label: string; tip: string }[] = [
  { value: 'target',     label: 'Target',          tip: 'The outcome variable you want to estimate for small areas (e.g. poverty rate, income).' },
  { value: 'area-id',   label: 'Area identifier',  tip: 'The column that identifies which small area each record belongs to (e.g. district code).' },
  { value: 'auxiliary', label: 'Auxiliary',         tip: 'A covariate available in both the survey and the population data that is correlated with the target.' },
  { value: 'weight',    label: 'Survey weight',     tip: 'The sampling weight for each unit, reflecting the probability of selection.' },
  { value: 'direct-est', label: 'Direct estimate', tip: 'A pre-computed area-level estimate (e.g. from the direct estimator). Used only by area-level methods.' },
  { value: 'direct-var', label: 'Sampling variance', tip: 'The estimated sampling variance of the direct estimate. Required by Fay–Herriot models.' },
  { value: 'coordinate', label: 'Coordinate',       tip: 'A geographic coordinate (latitude or longitude). Required by spatially adaptive methods.' },
  { value: 'ignored',   label: 'Ignore',            tip: 'This variable will not be used in the analysis.' },
]

const TYPES: VariableType[] = ['continuous', 'binary', 'proportion', 'count', 'categorical', 'identifier', 'unknown']

function suggestRole(v: Variable): VariableRole {
  const n = v.name.toLowerCase()
  if (v.type === 'identifier') return 'area-id'
  if (/weight|wt$|pweight|fweight/.test(n)) return 'weight'
  if (/area|district|region|province|zone|psu|ea$|code$/.test(n)) return 'area-id'
  if (/lat$|latitude/.test(n) || /lon$|longitude/.test(n)) return 'coordinate'
  if (/dir_est|direct_est|ye$|yhat/.test(n)) return 'direct-est'
  if (/dir_var|var_dir|mse$/.test(n)) return 'direct-var'
  return 'ignored'
}

export function Step2Roles() {
  const { state, dispatch } = useWizard()

  // Auto-suggest roles on first render of this step
  useEffect(() => {
    const anyAssigned = state.variables.some(v => v.role !== 'ignored')
    if (!anyAssigned) {
      const suggested = state.variables.map(v => ({ ...v, role: suggestRole(v) }))
      dispatch({ type: 'SET_VARIABLES', payload: suggested })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function setRole(i: number, role: VariableRole) {
    const updated = state.variables.map((v, idx) => idx === i ? { ...v, role } : v)
    dispatch({ type: 'SET_VARIABLES', payload: updated })
  }

  function setType(i: number, type: VariableType) {
    const updated = state.variables.map((v, idx) => idx === i ? { ...v, type } : v)
    dispatch({ type: 'SET_VARIABLES', payload: updated })
  }

  const targets  = state.variables.filter(v => v.role === 'target')
  const areaIds  = state.variables.filter(v => v.role === 'area-id')
  const auxVars  = state.variables.filter(v => v.role === 'auxiliary')

  const errors: string[] = []
  if (targets.length !== 1) errors.push(`Exactly one variable must be assigned the "Target" role (currently ${targets.length}).`)
  if (areaIds.length < 1)   errors.push('At least one variable must be assigned the "Area identifier" role.')
  if (auxVars.length < 1)   errors.push('At least one variable must be assigned the "Auxiliary" role.')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Step 2 — Variable roles and types</h2>
        <p className="mt-1 text-sm text-gray-600">
          Assign a role and confirm the type for each variable. Roles marked with (?) have tooltips explaining what they mean.
        </p>
      </div>

      <div className="overflow-x-auto rounded border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Label</th>
              <th className="px-3 py-2 text-left">
                <span className="flex items-center gap-0.5">
                  Role
                  <Tooltip text="Each variable plays one role in the analysis. Use 'Ignore' for variables not needed.">
                    <InfoIcon />
                  </Tooltip>
                </span>
              </th>
              <th className="px-3 py-2 text-left">Type</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {state.variables.map((v, i) => (
              <tr key={i} className={v.role === 'target' ? 'bg-indigo-50' : 'hover:bg-gray-50'}>
                <td className="px-3 py-2 font-mono text-xs">{v.name}</td>
                <td className="px-3 py-2 text-gray-500 text-xs">{v.label ?? '—'}</td>
                <td className="px-3 py-2">
                  <select
                    aria-label={`Role for ${v.name}`}
                    value={v.role}
                    onChange={e => setRole(i, e.target.value as VariableRole)}
                    className="border border-gray-300 rounded px-2 py-1 text-xs w-full focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {ROLES.map(r => (
                      <option key={r.value} value={r.value} title={r.tip}>{r.label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <select
                    aria-label={`Type for ${v.name}`}
                    value={v.type}
                    onChange={e => setType(i, e.target.value as VariableType)}
                    className="border border-gray-300 rounded px-2 py-1 text-xs w-full focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Role legend */}
      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
        {ROLES.filter(r => r.value !== 'ignored').map(r => (
          <div key={r.value} className="flex gap-1">
            <Tooltip text={r.tip}>
              <span className="font-medium text-gray-700 cursor-help underline decoration-dotted">{r.label}</span>
            </Tooltip>
            <span>— {r.tip.split('.')[0]}.</span>
          </div>
        ))}
      </div>

      {errors.length > 0 && (
        <ul role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3 space-y-1">
          {errors.map((e, i) => <li key={i}>• {e}</li>)}
        </ul>
      )}
    </div>
  )
}

