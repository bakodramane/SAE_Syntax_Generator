import { useRef, useState } from 'react'
import Papa from 'papaparse'
import type { Variable, VariableType } from '../types/index.js'
import { useWizard } from './WizardContext.js'

const VARIABLE_TYPES: VariableType[] = [
  'continuous', 'binary', 'proportion', 'count', 'categorical', 'identifier', 'unknown',
]

interface RawRow {
  name?: string
  label?: string
  type?: string
}

export function Step1Import() {
  const { state, dispatch } = useWizard()
  const [error, setError] = useState('')
  const [newName, setNewName] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [newType, setNewType] = useState<VariableType>('unknown')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    setError('')
    Papa.parse<RawRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const rows = results.data
        if (!rows[0] || !('name' in rows[0])) {
          setError('The CSV must have a "name" column. Please check your file and try again.')
          return
        }
        const parsed: Variable[] = rows
          .filter(r => r.name && r.name.trim())
          .map(r => ({
            name: r.name!.trim(),
            label: r.label?.trim() || undefined,
            type: (VARIABLE_TYPES.includes(r.type as VariableType) ? r.type : 'unknown') as VariableType,
            role: 'ignored' as const,
          }))
        if (parsed.length === 0) {
          setError('No variables found in the CSV. Please add at least one row with a name.')
          return
        }
        dispatch({ type: 'SET_VARIABLES', payload: parsed })
      },
      error(err) {
        setError(`Could not parse the file: ${err.message}`)
      },
    })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function addManual() {
    if (!newName.trim()) return
    const v: Variable = { name: newName.trim(), label: newLabel.trim() || undefined, type: newType, role: 'ignored' }
    dispatch({ type: 'SET_VARIABLES', payload: [...state.variables, v] })
    setNewName('')
    setNewLabel('')
    setNewType('unknown')
  }

  function removeVar(i: number) {
    dispatch({ type: 'SET_VARIABLES', payload: state.variables.filter((_, idx) => idx !== i) })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Step 1 — Your variables</h2>
        <p className="mt-1 text-sm text-gray-600">
          Upload your codebook as a CSV (columns: <code className="bg-gray-100 px-1 rounded">name</code>,{' '}
          <code className="bg-gray-100 px-1 rounded">label</code>,{' '}
          <code className="bg-gray-100 px-1 rounded">type</code>), or add variables one by one below.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors cursor-pointer"
        onClick={() => fileRef.current?.click()}
        role="button"
        aria-label="Upload CSV codebook"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
          data-testid="file-input"
        />
        <p className="text-gray-500 text-sm">Drag and drop a CSV file here, or click to browse</p>
        <p className="text-xs text-gray-400 mt-1">Required column: name — optional: label, type</p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
          {error}
        </p>
      )}

      {/* Manual entry */}
      <fieldset className="border border-gray-200 rounded-lg p-4 space-y-3">
        <legend className="text-sm font-medium text-gray-700 px-1">Add a variable manually</legend>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1" htmlFor="new-name">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="new-name"
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addManual()}
              placeholder="e.g. income"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1" htmlFor="new-label">Label</label>
            <input
              id="new-label"
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addManual()}
              placeholder="e.g. Household income"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1" htmlFor="new-type">Type</label>
            <select
              id="new-type"
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              value={newType}
              onChange={e => setNewType(e.target.value as VariableType)}
            >
              {VARIABLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <button
          type="button"
          onClick={addManual}
          disabled={!newName.trim()}
          className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          + Add variable
        </button>
      </fieldset>

      {/* Preview table */}
      {state.variables.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Variables ({state.variables.length})
          </h3>
          <div className="overflow-x-auto rounded border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Label</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {state.variables.map((v, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs">{v.name}</td>
                    <td className="px-3 py-2 text-gray-600">{v.label ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-500">{v.type}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => removeVar(i)}
                        className="text-red-500 hover:text-red-700 text-xs"
                        aria-label={`Remove ${v.name}`}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

