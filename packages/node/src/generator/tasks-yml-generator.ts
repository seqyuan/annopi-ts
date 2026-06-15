import { readFile } from 'node:fs/promises'
import { mkdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { writeYamlFile } from '../fs/yaml'
import type { RunnerPaths } from '../runtime/runner-paths'

function formatTimestamp(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

async function countLines(path: string): Promise<number> {
  try {
    const content = await readFile(path, 'utf-8')
    const lines = content.split('\n').length
    return lines > 0 ? lines : 1
  } catch {
    return 1
  }
}

export interface TaskMeta {
  numberedName: string
  resources: Record<string, unknown>
  annotaskOptions: Record<string, unknown>
  depends: string[]
}

export class TasksYmlGenerator {
  private readonly runners: RunnerPaths | undefined

  constructor(options: { runners?: RunnerPaths } = {}) {
    this.runners = options.runners
  }

  async generate(
    pipelineName: string,
    tasksMeta: TaskMeta[],
    shellDir: string,
    outdir: string,
    runners?: RunnerPaths,
  ): Promise<string> {
    const resolvedRunners = runners ?? this.runners
    if (!resolvedRunners) {
      throw new Error('TasksYmlGenerator requires runner paths')
    }

    const tasksPath = join(outdir, 'tasks.yml')
    const tasks: Record<string, {
      runcmd: string
      depends: string[]
      status: 'pending'
    }> = {}

    for (const meta of tasksMeta) {
      tasks[meta.numberedName] = {
        runcmd: await this.buildRunCmd(
          meta.numberedName,
          meta.resources,
          meta.annotaskOptions,
          shellDir,
          resolvedRunners,
        ),
        depends: meta.depends,
        status: 'pending',
      }
    }

    await mkdir(dirname(tasksPath), { recursive: true })
    await writeYamlFile(tasksPath, {
      pipeline: pipelineName,
      generated_at: formatTimestamp(),
      tasks,
    })

    return tasksPath
  }

  private async buildRunCmd(
    numberedName: string,
    resources: Record<string, unknown>,
    annotaskOptions: Record<string, unknown>,
    shellDir: string,
    runners: RunnerPaths,
  ): Promise<string> {
    const script = resolve(shellDir, `${numberedName}.sh`)
    const executor = typeof resources.executor === 'string'
      ? resources.executor
      : 'local'
    let lines = typeof annotaskOptions.lines === 'number'
      ? annotaskOptions.lines
      : 1
    const threads = typeof annotaskOptions.threads === 'number'
      ? annotaskOptions.threads
      : 10
    const project = typeof annotaskOptions.project === 'string'
      ? annotaskOptions.project
      : 'default'

    if (executor === 'qsubsge') {
      const parts = [
        runners.annotaskRunner,
        'qsubsge',
        `-i ${script}`,
        `-l ${lines}`,
        `-t ${threads}`,
      ]

      if (resources.cpu !== undefined) parts.push(`--cpu ${resources.cpu}`)
      if (resources.mem !== undefined) parts.push(`--mem ${resources.mem}`)
      if (resources.h_vmem !== undefined) parts.push(`--h_vmem ${resources.h_vmem}`)
      if (typeof resources.queue === 'string') parts.push(`--queue ${resources.queue}`)
      if (typeof resources.mode === 'string') parts.push(`--mode ${resources.mode}`)
      if (typeof resources.hostname === 'string') parts.push(`--hostname ${resources.hostname}`)
      parts.push(`--project ${project}`)
      return parts.join(' ')
    }

    lines = Math.max(lines, await countLines(script))
    return `${runners.localRunner} -i ${script} -l ${lines} -t ${threads}`
  }
}
