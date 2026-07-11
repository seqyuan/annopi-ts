import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { createAnnopiExtension } from '../src/index'

const repoRoot = resolve(fileURLToPath(new URL('../../..', import.meta.url)))
const annopiFixtures = join(repoRoot, 'tests', 'fixtures', 'annopi')

describe('createAnnopiExtension', () => {
  it('conf generates scripts and returns validation issues', async () => {
    const outdir = await mkdtemp(join(tmpdir(), 'annopi-extension-conf-'))
    const api = createAnnopiExtension()

    const result = await api.conf({
      pipelinePath: join(annopiFixtures, 'pipeline.yml'),
      projectPath: join(annopiFixtures, 'project.yml'),
      outdir,
    })

    expect(result.pipelineName).toBe('scRNA_pipeline')
    expect(result.taskCount).toBe(2)
    expect(result.issues.some(issue => issue.message.includes("task 'cellranger' ... OK"))).toBe(true)
    expect(result.tasksPath).toBe(join(outdir, 'tasks.yml'))
    expect(result.shellDir).toBe(join(outdir, 'shell'))
  })

  it('run reports all-done when sign files exist', async () => {
    const outdir = await mkdtemp(join(tmpdir(), 'annopi-extension-run-'))
    const api = createAnnopiExtension()

    const summary = await api.conf({
      pipelinePath: join(annopiFixtures, 'pipeline.yml'),
      projectPath: join(annopiFixtures, 'project.yml'),
      outdir,
    })

    const { readdir, writeFile } = await import('node:fs/promises')
    for (const file of await readdir(summary.shellDir)) {
      if (file.endsWith('.sh')) {
        await writeFile(join(summary.shellDir, `${file}.sign`), '')
      }
    }

    const result = await api.run({ outdir })
    expect(result.alreadyDone).toBe(true)
    expect(result.failed).toEqual([])
  })
})
