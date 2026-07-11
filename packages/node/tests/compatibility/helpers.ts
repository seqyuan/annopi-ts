import { readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { expect } from 'vitest'
import type { TasksFile } from '@seqyuan/annopi-core'
import { readYamlFile } from '../../src/fs/yaml'

const execFileAsync = promisify(execFile)

export async function hasPythonAnnopi(): Promise<boolean> {
  try {
    await execFileAsync('annopi', ['--version'])
    return true
  } catch {
    return false
  }
}

export async function runPythonConf(options: {
  pipelinePath: string
  projectPath: string
  outdir: string
}): Promise<void> {
  await execFileAsync('annopi', [
    'conf',
    '-p', options.pipelinePath,
    '-c', options.projectPath,
    '-o', options.outdir,
  ])
}

export async function runPythonRun(outdir: string): Promise<{ stdout: string; exitCode: number }> {
  try {
    const { stdout } = await execFileAsync('annopi', ['run', '-o', outdir])
    return { stdout, exitCode: 0 }
  } catch (error) {
    const execError = error as { stdout?: string; code?: number }
    return {
      stdout: execError.stdout ?? '',
      exitCode: typeof execError.code === 'number' ? execError.code : 1,
    }
  }
}

export async function writeAllSignFiles(shellDir: string): Promise<void> {
  for (const file of await readdir(shellDir)) {
    if (file.endsWith('.sh')) {
      await writeFile(join(shellDir, `${file}.sign`), '')
    }
  }
}

export async function loadTasksFile(tasksPath: string): Promise<TasksFile> {
  return readYamlFile<TasksFile>(tasksPath)
}

export function assertTasksFileShape(file: TasksFile): void {
  expect(file.pipeline).toBeTruthy()
  expect(file.generated_at).toBeTruthy()
  expect(Object.keys(file.tasks).length).toBeGreaterThan(0)

  for (const [name, task] of Object.entries(file.tasks)) {
    expect(name).toMatch(/^\d+-\d+-/)
    expect(typeof task.runcmd).toBe('string')
    expect(task.runcmd.length).toBeGreaterThan(0)
    expect(Array.isArray(task.depends)).toBe(true)
    expect(task.status).toBe('pending')
  }
}
