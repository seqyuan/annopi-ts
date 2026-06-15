import { access, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { TaskRuntimeState, TaskStatus, TasksFile } from '@seqyuan/annopi-core'
import { readYamlFile, writeYamlFile } from '../fs/yaml'

const VALID_STATUSES = new Set<TaskStatus>(['pending', 'running', 'done', 'failed'])

function formatTimestamp(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export class TasksState {
  private readonly tasksPath: string
  private lock: Promise<void> = Promise.resolve()

  constructor(tasksPath: string) {
    this.tasksPath = tasksPath
  }

  private async withLock<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.lock.then(fn)
    this.lock = run.then(() => undefined, () => undefined)
    return run
  }

  async load(): Promise<TasksFile> {
    return this.withLock(async () => readYamlFile<TasksFile>(this.tasksPath))
  }

  async getTasks(): Promise<Record<string, TaskRuntimeState>> {
    const file = await this.load()
    return file.tasks
  }

  private async save(data: TasksFile): Promise<void> {
    const tmpPath = `${this.tasksPath}.tmp`
    await writeYamlFile(tmpPath, data)
    const { rename } = await import('node:fs/promises')
    await rename(tmpPath, this.tasksPath)
  }

  async updateStatus(name: string, status: TaskStatus): Promise<void> {
    if (!VALID_STATUSES.has(status)) {
      throw new Error(`Invalid task status: ${status}`)
    }

    await this.withLock(async () => {
      const data = await readYamlFile<TasksFile>(this.tasksPath)
      const task = data.tasks[name]
      if (!task) {
        throw new Error(`Unknown task: ${name}`)
      }

      task.status = status
      if (status === 'running') {
        task.start_time = formatTimestamp()
      } else if (status === 'done' || status === 'failed') {
        task.end_time = formatTimestamp()
      }

      await this.save(data)
    })
  }

  async isSigned(name: string, shellDir: string): Promise<boolean> {
    try {
      await access(join(shellDir, `${name}.sh.sign`))
      return true
    } catch {
      return false
    }
  }

  async writeSign(name: string, shellDir: string): Promise<void> {
    await writeFile(join(shellDir, `${name}.sh.sign`), '')
  }

  async refreshFromSigns(shellDir: string): Promise<void> {
    await this.withLock(async () => {
      const data = await readYamlFile<TasksFile>(this.tasksPath)
      let changed = false

      for (const [name, task] of Object.entries(data.tasks)) {
        if (await this.isSigned(name, shellDir)) {
          if (task.status !== 'done') {
            task.status = 'done'
            changed = true
          }
        } else if (task.status !== 'pending') {
          task.status = 'pending'
          changed = true
        }
      }

      if (changed) {
        await this.save(data)
      }
    })
  }

  async getReady(): Promise<string[]> {
    const tasks = await this.getTasks()
    const ready: string[] = []

    for (const [name, task] of Object.entries(tasks)) {
      if (task.status !== 'pending') continue
      const deps = task.depends ?? []
      if (deps.every(dep => tasks[dep]?.status === 'done')) {
        ready.push(name)
      }
    }

    return ready
  }

  async isAllDone(): Promise<boolean> {
    const tasks = await this.getTasks()
    return Object.values(tasks).every(task => task.status === 'done')
  }

  async hasFailed(): Promise<boolean> {
    const tasks = await this.getTasks()
    return Object.values(tasks).some(task => task.status === 'failed')
  }

  async hasRunning(): Promise<boolean> {
    const tasks = await this.getTasks()
    return Object.values(tasks).some(task => task.status === 'running')
  }
}
