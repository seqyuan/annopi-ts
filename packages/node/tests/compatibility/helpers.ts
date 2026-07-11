import { readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { access } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { expect } from 'vitest'
import type { TasksFile } from '@seqyuan/annopi-core'
import { readYamlFile } from '../../src/fs/yaml'

const execFileAsync = promisify(execFile)

let cachedPythonAnnopiBin: string | null | undefined

const RESOLVE_PYTHON_ANNOPI = `
import importlib.util
import pathlib
import subprocess
import sys

if importlib.util.find_spec("annopi.generator.tasks_yml_generator") is None:
    raise SystemExit(1)

result = subprocess.run(
    [sys.executable, "-m", "pip", "show", "-f", "annopi"],
    capture_output=True,
    text=True,
)
if result.returncode != 0:
    raise SystemExit(1)

location = None
script = None
for line in result.stdout.splitlines():
    if line.startswith("Location:"):
        location = pathlib.Path(line.split(":", 1)[1].strip())
    elif line.endswith("/annopi") or line.endswith("\\\\annopi"):
        script = line.strip()
        break

if location is None or script is None:
    raise SystemExit(1)

path = (location / script).resolve()
if not path.exists():
    raise SystemExit(1)

print(path)
`.trim()

async function resolvePythonAnnopiBin(): Promise<string | null> {
  if (cachedPythonAnnopiBin !== undefined) {
    return cachedPythonAnnopiBin
  }

  try {
    const { stdout } = await execFileAsync('python3', ['-c', RESOLVE_PYTHON_ANNOPI])
    const candidate = stdout.trim()
    await access(candidate)
    cachedPythonAnnopiBin = candidate
    return candidate
  } catch {
    cachedPythonAnnopiBin = null
    return null
  }
}

export async function hasPythonAnnopi(): Promise<boolean> {
  return (await resolvePythonAnnopiBin()) !== null
}

export async function runPythonConf(options: {
  pipelinePath: string
  projectPath: string
  outdir: string
}): Promise<void> {
  const annopiBin = await resolvePythonAnnopiBin()
  if (!annopiBin) {
    throw new Error('Python annopi is not installed')
  }

  await execFileAsync(annopiBin, [
    'conf',
    '-p', options.pipelinePath,
    '-c', options.projectPath,
    '-o', options.outdir,
  ])
}

export async function runPythonRun(outdir: string): Promise<{ stdout: string; exitCode: number }> {
  const annopiBin = await resolvePythonAnnopiBin()
  if (!annopiBin) {
    return { stdout: '', exitCode: 1 }
  }

  try {
    const { stdout } = await execFileAsync(annopiBin, ['run', '-o', outdir])
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
