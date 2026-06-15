import { describe, expect, it } from 'vitest'
import { ParamResolver } from '../../src/resolver/param-resolver'

const projectConfig = {
  sample: [
    { sample_name: '0H', sample_id: 'ED001', group: 'CTRL' },
    { sample_name: '24H', sample_id: 'ED002', group: 'Perfu24h' },
    { sample_name: '48H', sample_id: 'ED003', group: 'Perfu48h' },
  ],
  cmp: {
    group: [
      { case: 'Perfu24h', control: 'CTRL' },
      { case: 'Perfu48h', control: 'CTRL' },
    ],
  },
  Para: {
    Para_ref: '/path/to/ref',
    Para_clean: '/path/to/clean',
    Para_project_id: 'PM-001',
  },
}

describe('ParamResolver', () => {
  it('resolves config and deps references', () => {
    const resolver = new ParamResolver(
      { Para: { project_name: 'demo' } },
      { fastqc: '/usr/bin/fastqc' },
    )

    expect(resolver.resolveString('${config.Para.project_name}')).toBe('demo')
    expect(resolver.resolveString('${deps.fastqc}')).toBe('/usr/bin/fastqc')
  })

  it('resolves nested config values', () => {
    const resolver = new ParamResolver(projectConfig)
    expect(resolver.resolveString('prefix_${config.Para.Para_ref}_suffix'))
      .toBe('prefix_/path/to/ref_suffix')
  })

  it('detects sample, cmp, and single modes', () => {
    const resolver = new ParamResolver(projectConfig)
    expect(resolver.detectMode({ name: '${sample.sample_name}' })).toBe('sample')
    expect(resolver.detectMode({}, 'echo ${sample.sample_name}')).toBe('sample')
    expect(resolver.detectMode({ case: '${cmp.case}' })).toBe('cmp')
    expect(resolver.detectMode({ ref: '${config.Para.Para_ref}' })).toBe('single')
  })

  it('rejects mixed sample and cmp modes', () => {
    const resolver = new ParamResolver(projectConfig)
    expect(() => resolver.detectMode({
      name: '${sample.sample_name}',
      case: '${cmp.case}',
    })).toThrow('Cannot mix')
  })

  it('expands sample params', () => {
    const resolver = new ParamResolver(projectConfig)
    const results = resolver.expand({
      name: '${sample.sample_name}',
      ref: '${config.Para.Para_ref}',
    })

    expect(results).toHaveLength(3)
    expect(results[0]).toEqual({ name: '0H', ref: '/path/to/ref' })
    expect(results[1]).toEqual({ name: '24H', ref: '/path/to/ref' })
  })

  it('expands cmp params', () => {
    const resolver = new ParamResolver(projectConfig)
    const results = resolver.expand({
      case: '${cmp.case}',
      control: '${cmp.control}',
    })

    expect(results).toHaveLength(2)
    expect(results[0]).toEqual({ case: 'Perfu24h', control: 'CTRL' })
  })

  it('renders commands and resolves deps in command', () => {
    const resolver = new ParamResolver({ Para: {} }, { cellranger: '/opt/cellranger' })
    expect(resolver.renderCommand(
      'cellranger count --id=${name} --ref=${ref}',
      { name: '0H', ref: '/path/to/ref' },
    )).toBe('cellranger count --id=0H --ref=/path/to/ref')

    expect(resolver.renderCommand(
      '${deps.cellranger}/cellranger count --id=${name}',
      { name: 'sample1' },
    )).toBe('/opt/cellranger/cellranger count --id=sample1')
  })

  it('renders direct sample and cmp refs in command', () => {
    const resolver = new ParamResolver(projectConfig)
    const sampleCommands = resolver.expand({}, { command: 'echo ${sample.sample_name}' })
      .map(entry => resolver.renderCommand('echo ${sample.sample_name}', entry))
    expect(sampleCommands).toEqual(['echo 0H', 'echo 24H', 'echo 48H'])

    const cmpCommands = resolver.expand({}, { command: 'echo ${cmp.case} ${cmp.control}' })
      .map(entry => resolver.renderCommand('echo ${cmp.case} ${cmp.control}', entry))
    expect(cmpCommands).toEqual(['echo Perfu24h CTRL', 'echo Perfu48h CTRL'])
  })

  it('handles optional sample blocks', () => {
    const resolver = new ParamResolver({
      sample: [
        { sample_name: 'S1', adapter: 'AGATCGGAAGAGC' },
        { sample_name: 'S2' },
      ],
    })

    const results = resolver.expand({
      cmd: 'trim ${sample.sample_name} ${sample.adapter? --adapter ${sample.adapter}}',
    })

    expect(results[0]?.cmd).toBe('trim S1 --adapter AGATCGGAAGAGC')
    expect(results[1]?.cmd).toBe('trim S2 ')
  })

  it('resolves group_by cross references and skips unresolvable samples', () => {
    const resolver = new ParamResolver({
      sample: [
        { sample_name: 'IP1', type: 'IP', group: 'G1' },
        { sample_name: 'Input1', type: 'input', group: 'G1' },
        { sample_name: 'IP2', type: 'IP', group: 'G2' },
        { sample_name: 'Input2', type: 'input', group: 'G2' },
      ],
    })

    const results = resolver.expand(
      { cmd: 'callpeak -t ${sample.sample_name} -c ${sample[type=input].sample_name}' },
      { groupBy: 'group' },
    )

    expect(results).toHaveLength(2)
    expect(results[0]?.cmd).toBe('callpeak -t IP1 -c Input1')
    expect(results[1]?.cmd).toBe('callpeak -t IP2 -c Input2')
  })

  it('resolves cmp case/control sample lists', () => {
    const resolver = new ParamResolver({
      sample: [
        { sample_name: 'S1', condition: 'treat' },
        { sample_name: 'S2', condition: 'treat' },
        { sample_name: 'S3', condition: 'ctrl' },
        { sample_name: 'S4', condition: 'ctrl' },
      ],
      cmp: [
        { name: 'treat_vs_ctrl', case: 'treat', control: 'ctrl', by: 'condition' },
      ],
    })

    const results = resolver.expand({
      cmd: 'diff --case ${cmp.case_samples.sample_name} --ctrl ${cmp.control_samples.sample_name}',
    })

    expect(results[0]?.cmd).toBe('diff --case S1,S2 --ctrl S3,S4')
  })
})
