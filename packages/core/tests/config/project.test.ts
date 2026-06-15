import { describe, expect, it } from 'vitest'
import { parseProjectConfig } from '../../src/config/project'

describe('parseProjectConfig', () => {
  it('parses samples, params, and combines', () => {
    const config = parseProjectConfig({
      sample: [{ id: 'S1' }],
      Para: { project_name: 'demo' },
      Combine: ['a', 'b'],
    })

    expect(config.samples).toEqual([{ id: 'S1' }])
    expect(config.params).toEqual({ project_name: 'demo' })
    expect(config.combines).toEqual(['a', 'b'])
  })

  it('supports cmp list structure', () => {
    const config = parseProjectConfig({
      cmp: [{ case: 'A', control: 'B' }],
    })

    expect(config.comparisons).toEqual([{ case: 'A', control: 'B' }])
  })

  it('supports cmp.group structure', () => {
    const config = parseProjectConfig({
      cmp: { group: [{ case: 'A', control: 'B' }] },
    })

    expect(config.comparisons).toEqual([{ case: 'A', control: 'B' }])
  })
})
