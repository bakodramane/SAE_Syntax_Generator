import { createContext, useContext, useReducer } from 'react'
import type { ReactNode } from 'react'
import type { Variable, DataAvailability } from '../types/index.js'

// ── State ──────────────────────────────────────────────────────────────────────

export interface WizardState {
  step: number
  variables: Variable[]
  availability: DataAvailability
  stataVersion: number
  selectedMethodId: string | null
  comparisonMethodId: string | null
  surveyDataPath: string
  censusDataPath: string
  areaDataPath: string
  nSimulations: number
  mseMethod: 'analytic' | 'bootstrap'
}

// ── Actions ────────────────────────────────────────────────────────────────────

type WizardAction =
  | { type: 'SET_STEP'; payload: number }
  | { type: 'SET_VARIABLES'; payload: Variable[] }
  | { type: 'SET_AVAILABILITY'; payload: DataAvailability }
  | { type: 'SET_STATA_VERSION'; payload: number }
  | { type: 'SELECT_METHOD'; payload: string | null }
  | { type: 'SELECT_COMPARISON'; payload: string | null }
  | { type: 'SET_SURVEY_PATH'; payload: string }
  | { type: 'SET_CENSUS_PATH'; payload: string }
  | { type: 'SET_AREA_PATH'; payload: string }
  | { type: 'SET_N_SIM'; payload: number }
  | { type: 'SET_MSE_METHOD'; payload: 'analytic' | 'bootstrap' }
  | { type: 'RESET' }

// ── Initial state ──────────────────────────────────────────────────────────────

const defaultAvailability: DataAvailability = {
  hasMicrodata: false,
  hasAreaAggregates: false,
  hasWeights: false,
  hasCensusAuxiliaries: false,
  hasContiguityMatrix: false,
  hasCoordinates: false,
  hasOutOfSampleAreas: false,
  targetType: 'unknown',
  likelyOutliers: false,
  likelySpatialCorrelation: false,
  auxiliaryFromSample: false,
  hasAuxiliaryVariances: false,
}

const initialState: WizardState = {
  step: 1,
  variables: [],
  availability: defaultAvailability,
  stataVersion: 14,
  selectedMethodId: null,
  comparisonMethodId: null,
  surveyDataPath: 'survey.csv',
  censusDataPath: 'census.csv',
  areaDataPath: 'area_data.csv',
  nSimulations: 200,
  mseMethod: 'bootstrap',
}

// ── Reducer ────────────────────────────────────────────────────────────────────

function reducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.payload }
    case 'SET_VARIABLES':
      return { ...state, variables: action.payload }
    case 'SET_AVAILABILITY':
      return { ...state, availability: action.payload }
    case 'SET_STATA_VERSION':
      return { ...state, stataVersion: action.payload }
    case 'SELECT_METHOD':
      return { ...state, selectedMethodId: action.payload }
    case 'SELECT_COMPARISON':
      return { ...state, comparisonMethodId: action.payload }
    case 'SET_SURVEY_PATH':
      return { ...state, surveyDataPath: action.payload }
    case 'SET_CENSUS_PATH':
      return { ...state, censusDataPath: action.payload }
    case 'SET_AREA_PATH':
      return { ...state, areaDataPath: action.payload }
    case 'SET_N_SIM':
      return { ...state, nSimulations: action.payload }
    case 'SET_MSE_METHOD':
      return { ...state, mseMethod: action.payload }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

// ── Context ────────────────────────────────────────────────────────────────────

interface WizardContextValue {
  state: WizardState
  dispatch: React.Dispatch<WizardAction>
}

const WizardContext = createContext<WizardContextValue | null>(null)

export function WizardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  return <WizardContext.Provider value={{ state, dispatch }}>{children}</WizardContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWizard(): WizardContextValue {
  const ctx = useContext(WizardContext)
  if (!ctx) throw new Error('useWizard must be used inside WizardProvider')
  return ctx
}
