import { WizardProvider, useWizard } from './WizardContext.js'
import { Step1Import } from './Step1Import.js'
import { Step2Roles } from './Step2Roles.js'
import { Step3Availability } from './Step3Availability.js'
import { Step4Methods } from './Step4Methods.js'
import { Step5Generate } from './Step5Generate.js'
import type { Variable } from '../types/index.js'

function step1Valid(variables: Variable[]) { return variables.length > 0 }
function step2Valid(variables: Variable[]) {
  return (
    variables.filter(v => v.role === 'target').length === 1 &&
    variables.filter(v => v.role === 'area-id').length >= 1 &&
    variables.filter(v => v.role === 'auxiliary').length >= 1
  )
}

const STEPS = [
  { label: 'Variables' },
  { label: 'Roles' },
  { label: 'Data' },
  { label: 'Methods' },
  { label: 'Download' },
]

function ProgressBar({ step }: { step: number }) {
  return (
    <nav aria-label="Progress" className="flex gap-1 mb-8">
      {STEPS.map((s, i) => {
        const n = i + 1
        const done = step > n
        const current = step === n
        return (
          <div key={n} className="flex items-center flex-1">
            <div className={`flex items-center gap-1.5 flex-1 ${i < STEPS.length - 1 ? 'after:flex-1 after:h-0.5 after:mx-1' : ''}`}>
              <span
                className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                  ${done    ? 'bg-indigo-600 text-white'
                  : current ? 'bg-indigo-600 text-white ring-4 ring-indigo-100'
                             : 'bg-gray-200 text-gray-500'}`}
                aria-current={current ? 'step' : undefined}
              >
                {done ? '✓' : n}
              </span>
              <span className={`text-xs font-medium hidden sm:inline ${current ? 'text-indigo-700' : 'text-gray-500'}`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 ${done ? 'bg-indigo-600' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </nav>
  )
}

function WizardInner() {
  const { state, dispatch } = useWizard()
  const { step, variables, selectedMethodId } = state

  const canAdvance =
    step === 1 ? step1Valid(variables)
    : step === 2 ? step2Valid(variables)
    : step === 3 ? true                          // no required flags
    : step === 4 ? selectedMethodId !== null
    : false

  function goNext() { if (canAdvance) dispatch({ type: 'SET_STEP', payload: step + 1 }) }
  function goBack() { dispatch({ type: 'SET_STEP', payload: step - 1 }) }
  function reset()  { dispatch({ type: 'RESET' }) }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">SAE Syntax Generator</h1>
          <p className="text-xs text-gray-500">Small area estimation — script generator</p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="text-xs text-gray-500 hover:text-gray-700 underline"
        >
          Start over
        </button>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <ProgressBar step={step} />

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-96">
          {step === 1 && <Step1Import />}
          {step === 2 && <Step2Roles />}
          {step === 3 && <Step3Availability />}
          {step === 4 && <Step4Methods />}
          {step === 5 && <Step5Generate />}
        </div>

        <div className="flex justify-between mt-6">
          {step > 1 ? (
            <button
              type="button"
              onClick={goBack}
              className="px-5 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 font-medium"
            >
              ← Back
            </button>
          ) : <span />}

          {step < 5 && (
            <button
              type="button"
              onClick={goNext}
              disabled={!canAdvance}
              className="px-5 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          )}
        </div>
      </main>
    </div>
  )
}

export function Wizard() {
  return (
    <WizardProvider>
      <WizardInner />
    </WizardProvider>
  )
}
