import { access } from 'node:fs/promises'
import { resolveOutputPaths } from '../fs/paths'
import { runTask } from './run-task'
import { TasksState } from '../state/tasks-state'

export interface RunPipelineResult {
  completed: string[]
  failed: string[]
  alreadyDone: boolean
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function runPipeline(options: {
  outdir: string
}): Promise<RunPipelineResult> {
  const paths = resolveOutputPaths(options.outdir)

  try {
    await access(paths.tasksPath)
  } catch {
    throw new Error("tasks.yml not found. Run 'annopi conf' first.")
  }

  const state = new TasksState(paths.tasksPath)
  await state.refreshFromSigns(paths.shellDir)

  if (await state.isAllDone()) {
    return {
      completed: Object.keys(await state.getTasks()),
      failed: [],
      alreadyDone: true,
    }
  }

  const running = new Map<string, Promise<'done' | 'failed'>>()
  const completed: string[] = []
  const failed: string[] = []

  while (true) {
    if (await state.isAllDone()) break

    if (
      await state.hasFailed()
      && !(await state.hasRunning())
      && running.size === 0
    ) {
      break
    }

    const ready = await state.getReady()
    const tasks = await state.getTasks()

    for (const numberedName of ready) {
      if (running.has(numberedName)) continue
      const runcmd = tasks[numberedName]?.runcmd
      if (!runcmd) continue

      const promise = runTask({
        numberedName,
        runcmd,
        state,
        shellDir: paths.shellDir,
      }).then((result) => {
        if (result === 'done') completed.push(numberedName)
        else failed.push(numberedName)
        running.delete(numberedName)
        return result
      })

      running.set(numberedName, promise)
    }

    if (running.size > 0) {
      await Promise.race([...running.values(), sleep(100)])
      continue
    }

    if (await state.isAllDone()) break
    if (await state.hasFailed()) break
    await sleep(100)
  }

  if (running.size > 0) {
    await Promise.all(running.values())
  }

  return { completed, failed, alreadyDone: false }
}
