export type TaskStatus = 'pending' | 'running' | 'done' | 'failed'

export interface TaskRuntimeState {
  runcmd: string
  depends: string[]
  status: TaskStatus
  start_time?: string
  end_time?: string
}

export interface TasksFile {
  pipeline: string
  generated_at: string
  tasks: Record<string, TaskRuntimeState>
}
