import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { runPipeline } from '../../src/runtime/run-pipeline'
import {
  assertTasksFileShape,
  hasPythonAnnopi,
  loadTasksFile,
  runPythonConf,
  writeAllSignFiles,
} from './helpers'

const repoRoot = resolve(fileURLToPath(new URL('../../../..', import.meta.url)))
const annopiFixtures = join(repoRoot, 'tests', 'fixtures', 'annopi')

describe('py-conf-ts-run', () => {
  let pythonAnnopiAvailable = false

  beforeAll(async () => {
    pythonAnnopiAvailable = await hasPythonAnnopi()
  })

  it('runs TS pipeline against Python conf output', async ({ skip }) => {
    if (!pythonAnnopiAvailable) skip()
    const outdir = await mkdtemp(join(tmpdir(), 'annopi-py-conf-ts-run-'))

    await runPythonConf({
      pipelinePath: join(annopiFixtures, 'pipeline.yml'),
      projectPath: join(annopiFixtures, 'project.yml'),
      outdir,
    })

    const tasksFile = await loadTasksFile(join(outdir, 'tasks.yml'))
    assertTasksFileShape(tasksFile)
    expect(Object.keys(tasksFile.tasks)).toEqual(['1-0-cellranger', '2-0-qc'])

    await writeAllSignFiles(join(outdir, 'shell'))

    const result = await runPipeline({ outdir })
    expect(result.alreadyDone).toBe(true)
    expect(result.failed).toEqual([])
    expect(result.completed).toEqual(['1-0-cellranger', '2-0-qc'])
  })
})
