export type VariableRole =
  | 'target'
  | 'area-id'
  | 'weight'
  | 'auxiliary'
  | 'auxiliary-variance'
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
  // True when auxiliary variables are estimated from a survey or large sample
  // (e.g. an agricultural census run as a sample) and therefore carry sampling error.
  auxiliaryFromSample: boolean
  // True when the user can supply the sampling variances of the auxiliary estimates,
  // area by area. Required by the measurement-error Fay–Herriot model (fh-me).
  hasAuxiliaryVariances: boolean
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
  // True when the method needs the sampling variances of the auxiliary estimates
  // (the measurement-error Fay–Herriot model). Treated as false when absent.
  requiresAuxiliaryVariances?: boolean
  mseMethod: 'prasad-rao' | 'bootstrap' | 'both' | 'posterior' | 'jackknife'
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
