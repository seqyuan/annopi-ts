import { describe, expect, it } from 'vitest'
import { DAGBuilder } from '../../src/dag/builder'

describe('DAGBuilder', () => {
  it('builds topological order and numbered names', () => {
    const dag = new DAGBuilder(
      ['qc', 'cellranger', 'report'],
      {
        cellranger: ['qc'],
        report: ['cellranger'],
      },
    )

    expect(dag.topologicalOrder()).toEqual(['qc', 'cellranger', 'report'])
    expect(dag.getLevel('qc')).toBe(1)
    expect(dag.getLevel('cellranger')).toBe(2)
    expect(dag.getLevel('report')).toBe(3)
    expect(dag.getNumberedNames()).toEqual({
      qc: '1-0-qc',
      cellranger: '2-0-cellranger',
      report: '3-0-report',
    })
  })

  it('detects cycles', () => {
    expect(() => new DAGBuilder(
      ['a', 'b'],
      { a: ['b'], b: ['a'] },
    )).toThrow('Cycle detected in task dependencies')
  })
})
