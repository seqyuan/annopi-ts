import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { AnnopiWorkflow } from '../../src/workflow/annopi-workflow'
import {
  assertTasksFileShape,
  hasPythonAnnopi,
  loadTasksFile,
  runPythonRun,
  writeAllSignFiles,
} from './helpers'

const repoRoot = resolve(fileURLToPath(new URL('../../../..', import.meta.url)))
const annopiFixtures = join(repoRoot, 'tests', 'fixtures', 'annopi')

describe('ts-conf-py-run', () => {
  let pythonAnnopiAvailable = false

  beforeAll(async () => {
    pythonAnnopiAvailable = await hasPythonAnnopi()
  })

  it('runs Python pipeline against TS conf output', async ({ skip }) => {
    if (!pythonAnnopiAvailable) skip()
    const outdir = await mkdtemp(join(tmpdir(), 'annopi-ts-conf-py-run-'))
    const workflow = new AnnopiWorkflow({
      pipelinePath: join(annopiFixtures, 'pipeline.yml'),
      projectPath: join(annopiFixtures, 'project.yml'),
      outdir,
    })

    const summary = await workflow.conf()
    const tasksFile = await loadTasksFile(summary.tasksPath)
    assertTasksFileShape(tasksFile)
    expect(Object.keys(tasksFile.tasks)).toEqual(['1-0-cellranger', '2-0-qc'])

    await writeAllSignFiles(summary.shellDir)

    const { stdout, exitCode } = await runPythonRun(outdir)
    expect(exitCode).toBe(0)
    expect(stdout.toLowerCase()).toContain('already done')
  })
})
