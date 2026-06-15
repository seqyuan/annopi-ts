import { access, constants } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { readYamlFile } from '../fs/yaml'
import type { ModuleRef } from '../modules/namespace-resolver'
import { NamespaceResolver } from '../modules/namespace-resolver'

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function taskNameFromPath(path: string): string {
  const parts = path.split('/')
  return parts[parts.length - 1] ?? path
}

export class TaskLoader {
  private readonly inlineTasks: Record<string, Record<string, unknown>>
  private readonly imports: string[]
  private readonly projectTasksDir: string | undefined
  private readonly resolver: NamespaceResolver

  constructor(options: {
    inlineTasks?: Record<string, Record<string, unknown>>
    imports?: string[]
    projectTasksDir?: string
    globalModulesDir?: string
  } = {}) {
    this.inlineTasks = options.inlineTasks ?? {}
    this.imports = options.imports ?? []
    this.projectTasksDir = options.projectTasksDir
    this.resolver = new NamespaceResolver(options.globalModulesDir)
  }

  async loadAll(): Promise<Record<string, Record<string, unknown>>> {
    const tasks: Record<string, Record<string, unknown>> = {}

    for (const imp of this.imports) {
      const ref = this.resolver.parse(imp)
      let installDir = this.resolver.getInstallDir(ref)

      if (this.projectTasksDir) {
        const localDir = join(
          this.projectTasksDir,
          'tasks',
          taskNameFromPath(ref.path),
        )
        if (await fileExists(join(localDir, 'task.yml'))) {
          installDir = localDir
        }
      }

      const taskYml = join(installDir, 'task.yml')
      if (await fileExists(taskYml)) {
        const taskDef = await readYamlFile<Record<string, unknown>>(taskYml)
        const name = typeof taskDef.name === 'string'
          ? taskDef.name
          : taskNameFromPath(ref.path)
        tasks[name] = taskDef
      }
    }

    for (const [taskName, taskDef] of Object.entries(this.inlineTasks)) {
      if (typeof taskDef.path === 'string') {
        let pathDir = taskDef.path
        if (!pathDir.startsWith('/') && this.projectTasksDir) {
          pathDir = resolve(this.projectTasksDir, taskDef.path)
        } else {
          pathDir = resolve(pathDir)
        }

        const taskYml = join(pathDir, 'task.yml')
        if (!(await fileExists(taskYml))) {
          throw new Error(`Task '${taskName}': task.yml not found at ${taskYml}`)
        }

        const loaded = await readYamlFile<Record<string, unknown>>(taskYml)
        const overrides = Object.fromEntries(
          Object.entries(taskDef).filter(([key]) => key !== 'path'),
        )
        tasks[taskName] = { ...loaded, ...overrides }
      }
    }

    for (const [taskName, taskDef] of Object.entries(this.inlineTasks)) {
      if (!('path' in taskDef)) {
        tasks[taskName] = taskDef
      }
    }

    return tasks
  }

  async collectDeps(
    pipelineDeps: Record<string, string>,
  ): Promise<{
    mergedDeps: Record<string, string>
    sourceMap: Record<string, string>
  }> {
    const mergedDeps: Record<string, string> = {}
    const sourceMap: Record<string, string> = {}
    const allTasks = await this.loadAll()

    for (const [taskName, taskDef] of Object.entries(allTasks)) {
      const taskDeps = taskDef.deps
      if (Array.isArray(taskDeps)) {
        for (const depEntry of taskDeps) {
          const entry = asRecord(depEntry)
          const name = entry.name
          const defaultPath = entry.default
          if (
            typeof name === 'string'
            && typeof defaultPath === 'string'
            && !(name in mergedDeps)
          ) {
            mergedDeps[name] = defaultPath
            sourceMap[name] = `task.yml default (${taskName})`
          }
        }
      }
    }

    for (const [name, path] of Object.entries(pipelineDeps)) {
      mergedDeps[name] = path
      sourceMap[name] = 'pipeline.yml'
    }

    return { mergedDeps, sourceMap }
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK)
    return true
  } catch {
    return false
  }
}
