import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import { confCommand } from '../src/commands/conf'
import { runCommand } from '../src/commands/run'

const repoRoot = resolve(fileURLToPath(new URL('../../..', import.meta.url)))
const annopiFixtures = join(repoRoot, 'tests', 'fixtures', 'annopi')

describe('cli workflow', () => {
  it('conf prints validation checks for annopi fixtures', async () => {
    const outdir = await mkdtemp(join(tmpdir(), 'annopi-cli-conf-'))
    const logs: string[] = []
    const errorLogs: string[] = []

    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(' '))
    })
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      errorLogs.push(args.map(String).join(' '))
    })

    const exitCode = await confCommand({
      pipeline: join(annopiFixtures, 'pipeline.yml'),
      project: join(annopiFixtures, 'project.yml'),
      outdir,
    })

    expect(exitCode).toBe(0)
    expect(logs.some(line => line.includes('[CHECK]'))).toBe(true)
    expect(logs.some(line => line.includes("task 'cellranger' ... OK"))).toBe(true)
    expect(logs.some(line => line.includes('Generated tasks.yml'))).toBe(true)
  })

  it('run reports all-done when sign files exist', async () => {
    const outdir = await mkdtemp(join(tmpdir(), 'annopi-cli-run-'))
    await confCommand({
      pipeline: join(annopiFixtures, 'pipeline_with_deps.yml'),
      project: join(annopiFixtures, 'project.yml'),
      outdir,
    })

    const { readdir, writeFile } = await import('node:fs/promises')
    const shellDir = join(outdir, 'shell')
    for (const file of await readdir(shellDir)) {
      if (file.endsWith('.sh')) {
        await writeFile(join(shellDir, `${file}.sign`), '')
      }
    }

    const logs: string[] = []
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(' '))
    })

    const exitCode = await runCommand({ outdir })
    expect(exitCode).toBe(0)
    expect(logs.some(line => line.toLowerCase().includes('already done'))).toBe(true)
  })
})
