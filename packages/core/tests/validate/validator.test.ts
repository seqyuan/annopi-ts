import { describe, expect, it } from 'vitest'
import {
  collectValidationIssues,
  validateConfigRefs,
  validateDepsDeclared,
  validateSampleRefs,
  validateTaskFormat,
} from '../../src/validate/validator'

const projectRaw = {
  Para: { project_name: 'demo', ref: '/path/to/ref' },
  sample: [{ id: 'S1', name: 'Sample 1' }],
}

describe('validator', () => {
  it('flags missing command', () => {
    const issues = validateTaskFormat('qc', {})
    expect(issues[0]?.message).toContain("missing required field 'command'")
  })

  it('detects undeclared deps', () => {
    const issues = validateDepsDeclared(
      '${deps.fastqc} ${sample.id}',
      { tool: '${deps.unknown}' },
      { fastqc: '/usr/bin/fastqc' },
    )
    expect(issues).toHaveLength(1)
    expect(issues[0]?.message).toContain('is not declared')
  })

  it('detects invalid config refs', () => {
    const issues = validateConfigRefs(
      '${config.Para.project_name}',
      { missing: '${config.Para.missing_field}' },
      projectRaw,
    )
    expect(issues).toHaveLength(1)
    expect(issues[0]?.message).toContain('missing_field')
  })

  it('detects invalid sample refs', () => {
    const issues = validateSampleRefs(
      'echo ${sample.id}',
      { bad: '${sample.unknown_field}' },
      projectRaw.sample as Array<Record<string, unknown>>,
    )
    expect(issues).toHaveLength(1)
    expect(issues[0]?.message).toContain('unknown_field')
  })

  it('aggregates validation results', () => {
    const result = collectValidationIssues([
      { level: 'warning', message: 'warn' },
      { level: 'error', message: 'error' },
    ])
    expect(result.hasErrors).toBe(true)
  })
})
