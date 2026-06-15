import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  AnnopiWorkflow,
  ConfValidationError,
  readYamlFile,
  runPipeline,
  TasksState,
} from '../../src'

const repoRoot = resolve(fileURLToPath(new URL('../../../..', import.meta.url)))
const annopiFixtures = join(repoRoot, 'tests', 'fixtures', 'annopi')

describe('workflow e2e (annopi fixtures)', () => {
  it('conf generates scripts and tasks.yml for scRNA pipeline', async () => {
    const outdir = await mkdtemp(join(tmpdir(), 'annopi-e2e-conf-'))
    const workflow = new AnnopiWorkflow({
      pipelinePath: join(annopiFixtures, 'pipeline.yml'),
      projectPath: join(annopiFixtures, 'project.yml'),
      outdir,
    })

    const summary = await workflow.conf()

    expect(summary.pipelineName).toBe('scRNA_pipeline')
    expect(summary.taskCount).toBe(2)
    expect(summary.issues.some(issue => issue.message.includes("... OK"))).toBe(true)

    const shellDir = summary.shellDir
    const cellrangerScript = await readFile(join(shellDir, '1-0-cellranger.sh'), 'utf-8')
    const qcScript = await readFile(join(shellDir, '2-0-qc.sh'), 'utf-8')
    const tasksYaml = await readYamlFile<{
      tasks: Record<string, { runcmd: string; depends: string[] }>
    }>(summary.tasksPath)

    expect(cellrangerScript.trim().split('\n')).toHaveLength(3)
    expect(qcScript.trim().split('\n')).toHaveLength(3)

    expect(tasksYaml.tasks['1-0-cellranger']?.runcmd).toContain('annotask qsubsge')
    expect(tasksYaml.tasks['1-0-cellranger']?.runcmd).toContain('--cpu 8')

    const qcRuncmd = tasksYaml.tasks['2-0-qc']?.runcmd ?? ''
    expect(qcRuncmd.split(' -i ', 1)[0]?.endsWith('ata')).toBe(true)
    expect(qcRuncmd).not.toContain('qsubsge')
    expect(qcRuncmd).not.toContain('--project')
    expect(tasksYaml.tasks['2-0-qc']?.depends).toEqual(['1-0-cellranger'])
  })

  it('conf then run detects all-done state via .sign files', async () => {
    const outdir = await mkdtemp(join(tmpdir(), 'annopi-e2e-run-'))
    const workflow = new AnnopiWorkflow({
      pipelinePath: join(annopiFixtures, 'pipeline.yml'),
      projectPath: join(annopiFixtures, 'project.yml'),
      outdir,
    })

    const summary = await workflow.conf()
    const state = new TasksState(summary.tasksPath)
    const tasks = await state.getTasks()

    for (const name of Object.keys(tasks)) {
      await state.writeSign(name, summary.shellDir)
    }

    const result = await runPipeline({ outdir })
    expect(result.alreadyDone).toBe(true)
    expect(result.failed).toEqual([])
  })

  it('conf expands deps pipeline for each sample', async () => {
    const outdir = await mkdtemp(join(tmpdir(), 'annopi-e2e-deps-'))
    const workflow = new AnnopiWorkflow({
      pipelinePath: join(annopiFixtures, 'pipeline_with_deps.yml'),
      projectPath: join(annopiFixtures, 'project.yml'),
      outdir,
    })

    const summary = await workflow.conf()
    const script = await readFile(join(summary.shellDir, '1-0-cellranger.sh'), 'utf-8')
    const lines = script.trim().split('\n')

    expect(lines).toHaveLength(3)
    expect(lines[0]).toContain('/opt/cellranger-7.0.0/cellranger count')
    expect(lines[0]).toContain('--id=0H')
    expect(lines[1]).toContain('--id=24H')
  })

  it('conf rejects undeclared deps references', async () => {
    const outdir = await mkdtemp(join(tmpdir(), 'annopi-e2e-bad-'))
    const projectFile = join(outdir, 'project.yml')
    const pipelineFile = join(outdir, 'pipeline_bad.yml')

    await writeFile(projectFile, `Para:
  project_id: TEST001
sample:
  - sample_name: S1
`)
    await writeFile(pipelineFile, `name: test_pipeline
version: 1.0.0
tasks:
  test_task:
    command: \${deps.undeclared_tool}/run.sh
    params:
      output: /tmp/out
`)

    const workflow = new AnnopiWorkflow({
      pipelinePath: pipelineFile,
      projectPath: projectFile,
      outdir: join(outdir, 'output'),
    })

    await expect(workflow.conf()).rejects.toBeInstanceOf(ConfValidationError)
  })
})
