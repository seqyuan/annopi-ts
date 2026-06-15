import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { resolveOutputPaths } from '../../src/fs/paths'
import { readYamlFile, writeYamlFile } from '../../src/fs/yaml'
import { ScriptGenerator } from '../../src/generator/script-generator'

describe('resolveOutputPaths', () => {
  it('normalizes outdir paths', () => {
    expect(resolveOutputPaths('./work/')).toEqual({
      outdir: './work',
      shellDir: './work/shell',
      tasksPath: './work/tasks.yml',
    })
  })
})

describe('yaml helpers', () => {
  it('round-trips yaml objects', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'annopi-yaml-'))
    const path = join(dir, 'sample.yml')

    await writeYamlFile(path, { name: 'demo', tasks: { qc: { status: 'pending' } } })
    const loaded = await readYamlFile<Record<string, unknown>>(path)

    expect(loaded.name).toBe('demo')
  })
})

describe('ScriptGenerator', () => {
  it('writes shell scripts with trailing newline', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'annopi-shell-'))
    const shellDir = join(dir, 'shell')
    const generator = new ScriptGenerator(shellDir)

    const scriptPath = await generator.generateTaskScript('1-0-qc', ['#!/usr/bin/env bash', 'fastqc sample1'])
    const { readFile } = await import('node:fs/promises')
    const content = await readFile(scriptPath, 'utf-8')

    expect(scriptPath.endsWith('1-0-qc.sh')).toBe(true)
    expect(content).toContain('fastqc sample1')
  })
})
