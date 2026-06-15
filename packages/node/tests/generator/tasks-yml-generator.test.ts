import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ScriptGenerator } from '../../src/generator/script-generator'
import { TasksYmlGenerator } from '../../src/generator/tasks-yml-generator'
import { TasksState } from '../../src/state/tasks-state'

describe('TasksYmlGenerator', () => {
  it('generates local and qsubsge run commands', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'annopi-tasks-yml-'))
    const shellDir = join(dir, 'shell')
    const generator = new ScriptGenerator(shellDir)
    await generator.generateTaskScript('1-0-qc', ['fastqc sample1'])

    const tasksYmlGen = new TasksYmlGenerator({
      runners: {
        localRunner: '/bin/ata',
        annotaskRunner: '/bin/annotask',
      },
    })
    const tasksPath = await tasksYmlGen.generate(
      'demo',
      [
        {
          numberedName: '1-0-qc',
          resources: { executor: 'local' },
          annotaskOptions: { lines: 1, threads: 4 },
          depends: [],
        },
        {
          numberedName: '2-0-report',
          resources: {
            executor: 'qsubsge',
            cpu: 2,
            queue: 'all.q',
          },
          annotaskOptions: { lines: 1, threads: 8, project: 'demo' },
          depends: ['1-0-qc'],
        },
      ],
      shellDir,
      dir,
    )

    const content = await readFile(tasksPath, 'utf-8')
    expect(content).toContain('pipeline: demo')
    expect(content).toContain('/bin/ata -i')
    expect(content).toContain('/bin/annotask qsubsge')
    expect(content).toContain('--cpu 2')
    expect(content).toContain('--queue')
    expect(content).toContain('all.q')
    expect(content).toContain('depends:')
  })
})

describe('TasksState', () => {
  it('tracks ready tasks and sign files', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'annopi-state-'))
    const shellDir = join(dir, 'shell')
    await mkdir(shellDir, { recursive: true })
    const tasksPath = join(dir, 'tasks.yml')

    await writeFile(tasksPath, `pipeline: demo
generated_at: 2026-01-01 00:00:00
tasks:
  1-0-qc:
    runcmd: echo qc
    depends: []
    status: pending
  2-0-report:
    runcmd: echo report
    depends: [1-0-qc]
    status: pending
`, 'utf-8')

    const state = new TasksState(tasksPath)
    expect(await state.getReady()).toEqual(['1-0-qc'])

    await state.writeSign('1-0-qc', shellDir)
    await state.refreshFromSigns(shellDir)

    const tasks = await state.getTasks()
    expect(tasks['1-0-qc']?.status).toBe('done')
    expect(await state.getReady()).toEqual(['2-0-report'])
  })
})
