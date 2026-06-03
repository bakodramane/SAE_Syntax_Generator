export type VariableRole =
  | 'target'
  | 'area-id'
  | 'weight'
  | 'auxiliary'
  | 'coordinate'
  | 'direct-est'
  | 'direct-var'
  | 'ignored'

export type VariableType =
  | 'continuous'
  | 'binary'
  | 'proportion'
  | 'count'
  | 'categorical'
  | 'identifier'
  | 'unknown'

export interface Variable {
  name: string
  label?: string
  type: VariableType
  role: VariableRole
  categories?: string[]
  notes?: string
}

export interface DataAvailability {
  hasMicrodata: boolean
  hasAreaAggregates: boolean
  hasWeights: boolean
  hasCensusAuxiliaries: boolean
  hasContiguityMatrix: boolean
  hasCoordinates: boolean
  hasOutOfSampleAreas: boolean
  targetType: 'continuous' | 'binary' | 'proportion' | 'count' | 'poverty' | 'unknown'
  likelyOutliers: boolean
  likelySpatialCorrelation: boolean
}

export interface CatalogueEntry {
  id: string
  displayName: string
  level: 'area' | 'unit' | 'model-assisted'
  inferenceType: 'frequentist' | 'bayesian' | 'design-based'
  targetTypes: DataAvailability['targetType'][]
  requiredInputs: {
    microdata: boolean
    areaAggregates: boolean
    censusAuxiliaries: 'unit' | 'area' | 'either' | 'none'
    weights: boolean
    contiguityMatrix: boolean
    coordinates: boolean
  }
  spatial: boolean
  robust: boolean
  mseMethod: 'prasad-rao' | 'bootstrap' | 'both' | 'posterior'
  rPackage: string
  rFunction: string
  rTemplate: string
  stataPackage: string
  stataCommand: string
  stataMinVersion: number
  stataV14Fallback: string | null
  stataTemplate: string
  plainDescription: string
  whyChooseThis: string
  assumptions: string[]
  references: string[]
  caveats?: string[]
}
