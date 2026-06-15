import { describe, expect, it } from 'vitest'
import { resolveRunnerPaths } from '../../src/runtime/runner-paths'

describe('resolveRunnerPaths', () => {
  it('prefers deps.ata for local and deps.annotask for qsubsge', async () => {
    const paths = await resolveRunnerPaths({
      ata: '/opt/ata',
      annotask: '/opt/annotask',
    })

    expect(paths.localRunner).toBe('/opt/ata')
    expect(paths.annotaskRunner).toBe('/opt/annotask')
  })

  it('falls back to annotask for local when ata is absent', async () => {
    const paths = await resolveRunnerPaths({
      annotask: '/opt/annotask',
    })

    expect(paths.localRunner).toBe('/opt/annotask')
    expect(paths.annotaskRunner).toBe('/opt/annotask')
  })
})
