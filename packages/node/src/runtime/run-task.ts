import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { dirname } from 'node:path'
import type { TasksState } from '../state/tasks-state'

const execAsync = promisify(exec)

export async function runTask(options: {
  numberedName: string
  runcmd: string
  state: TasksState
  shellDir: string
}): Promise<'done' | 'failed'> {
  const { numberedName, runcmd, state, shellDir } = options

  await state.updateStatus(numberedName, 'running')

  try {
    await execAsync(runcmd, { cwd: dirname(shellDir) })
    await state.writeSign(numberedName, shellDir)
    await state.updateStatus(numberedName, 'done')
    return 'done'
  } catch {
    await state.updateStatus(numberedName, 'failed')
    return 'failed'
  }
}
