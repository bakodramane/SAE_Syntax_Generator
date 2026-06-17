import type { CatalogueEntry } from '../types/index.js'
import direct from './direct.js'
import greg from './greg.js'
import fhEblup from './fh-eblup.js'
import spatialFh from './spatial-fh.js'
import robustFh from './robust-fh.js'
import hbFh from './hb-fh.js'
import bhfEblup from './bhf-eblup.js'
import ebpCensuseb from './ebp-censuseb.js'
import ell from './ell.js'
import mQuantile from './m-quantile.js'
import mqgwr from './mqgwr.js'
import reblup from './reblup.js'
import glmmBinary from './glmm-binary.js'
import glmmCount from './glmm-count.js'
import twoPartZinfl from './two-part-zinfl.js'
import hbUnit from './hb-unit.js'
import fhMe from './fh-me.js'

export const catalogue: CatalogueEntry[] = [
  direct,
  greg,
  fhEblup,
  spatialFh,
  robustFh,
  hbFh,
  bhfEblup,
  ebpCensuseb,
  ell,
  mQuantile,
  mqgwr,
  reblup,
  glmmBinary,
  glmmCount,
  twoPartZinfl,
  hbUnit,
  fhMe,
]

export default catalogue
