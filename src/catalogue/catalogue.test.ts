import { describe, it, expect } from 'vitest'
import { catalogue } from './index.js'
import type { CatalogueEntry } from '../types/index.js'

const EXPECTED_IDS = [
  'direct',
  'greg',
  'fh-eblup',
  'spatial-fh',
  'robust-fh',
  'hb-fh',
  'bhf-eblup',
  'ebp-censuseb',
  'ell',
  'm-quantile',
  'mqgwr',
  'reblup',
  'glmm-binary',
  'glmm-count',
  'two-part-zinfl',
  'hb-unit',
]

describe('Catalogue index', () => {
  it('exports exactly 16 entries', () => {
    expect(catalogue).toHaveLength(16)
  })

  it('contains all expected method IDs', () => {
    const ids = catalogue.map((e) => e.id)
    for (const id of EXPECTED_IDS) {
      expect(ids).toContain(id)
    }
  })
})

describe('Catalogue schema validation', () => {
  for (const entry of catalogue) {
    describe(`entry: ${entry.id}`, () => {
      it('has a non-empty id', () => {
        expect(entry.id).toBeTruthy()
      })

      it('has a non-empty displayName', () => {
        expect(entry.displayName).toBeTruthy()
      })

      it('has a valid level', () => {
        expect(['area', 'unit', 'model-assisted']).toContain(entry.level)
      })

      it('has a valid inferenceType', () => {
        expect(['frequentist', 'bayesian', 'design-based']).toContain(
          entry.inferenceType,
        )
      })

      it('has at least one targetType', () => {
        expect(entry.targetTypes.length).toBeGreaterThan(0)
      })

      it('has a non-empty rPackage', () => {
        expect(entry.rPackage).toBeTruthy()
      })

      it('has a non-empty rFunction', () => {
        expect(entry.rFunction).toBeTruthy()
      })

      it('has a non-empty stataPackage', () => {
        expect(entry.stataPackage).toBeTruthy()
      })

      it('has a non-empty stataCommand', () => {
        expect(entry.stataCommand).toBeTruthy()
      })

      it('has stataMinVersion as a number >= 14', () => {
        expect(typeof entry.stataMinVersion).toBe('number')
        expect(entry.stataMinVersion).toBeGreaterThanOrEqual(14)
      })

      it('has a non-null stataV14Fallback when stataMinVersion > 14', () => {
        if (entry.stataMinVersion > 14) {
          expect(entry.stataV14Fallback).not.toBeNull()
          expect(entry.stataV14Fallback).toBeTruthy()
        }
      })

      it('rTemplate contains at least one {{ token', () => {
        expect(entry.rTemplate).toContain('{{')
      })

      it('stataTemplate contains at least one {{ token', () => {
        expect(entry.stataTemplate).toContain('{{')
      })

      it('has at least one reference', () => {
        expect(entry.references.length).toBeGreaterThan(0)
        for (const ref of entry.references) {
          expect(ref).toBeTruthy()
        }
      })

      it('has at least one assumption', () => {
        expect(entry.assumptions.length).toBeGreaterThan(0)
        for (const assumption of entry.assumptions) {
          expect(assumption).toBeTruthy()
        }
      })

      it('has a non-empty plainDescription', () => {
        expect(entry.plainDescription).toBeTruthy()
      })

      it('has a non-empty whyChooseThis', () => {
        expect(entry.whyChooseThis).toBeTruthy()
      })

      it('has requiredInputs with all expected fields', () => {
        const r = entry.requiredInputs
        expect(typeof r.microdata).toBe('boolean')
        expect(typeof r.areaAggregates).toBe('boolean')
        expect(['unit', 'area', 'either', 'none']).toContain(r.censusAuxiliaries)
        expect(typeof r.weights).toBe('boolean')
        expect(typeof r.contiguityMatrix).toBe('boolean')
        expect(typeof r.coordinates).toBe('boolean')
      })

      it('has valid mseMethod', () => {
        expect(['prasad-rao', 'bootstrap', 'both', 'posterior']).toContain(
          entry.mseMethod,
        )
      })

      it('has boolean spatial and robust flags', () => {
        expect(typeof entry.spatial).toBe('boolean')
        expect(typeof entry.robust).toBe('boolean')
      })
    })
  }
})

describe('Type conformance', () => {
  it('all entries conform to CatalogueEntry interface', () => {
    for (const entry of catalogue) {
      const typed: CatalogueEntry = entry
      expect(typed.id).toBeTruthy()
    }
  })
})
