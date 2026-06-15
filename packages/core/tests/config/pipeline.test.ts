import { describe, expect, it } from 'vitest'
import { parsePipelineConfig } from '../../src/config/pipeline'

describe('parsePipelineConfig', () => {
  it('parses pipeline fields with defaults', () => {
    const config = parsePipelineConfig({
      name: 'demo',
      version: '1.0.0',
      imports: ['qc'],
      tasks: {
        qc: { command: 'fastqc ${sample.id}' },
      },
      dependencies: {
        report: ['qc'],
      },
      deps: {
        fastqc: '/usr/bin/fastqc',
      },
    })

    expect(config.name).toBe('demo')
    expect(config.version).toBe('1.0.0')
    expect(config.imports).toEqual(['qc'])
    expect(config.tasks.qc?.command).toBe('fastqc ${sample.id}')
    expect(config.dependencies.report).toEqual(['qc'])
    expect(config.deps.fastqc).toBe('/usr/bin/fastqc')
  })
})
