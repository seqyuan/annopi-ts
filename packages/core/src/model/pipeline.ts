export interface PipelineTaskDef {
  path?: string
  group_by?: string
  command?: string
  params?: Record<string, string>
  resources?: Record<string, unknown>
  annotask?: Record<string, unknown>
  depends?: string[]
  scripts?: string[]
  [key: string]: unknown
}

export interface PipelineConfig {
  name: string
  version: string
  imports: string[]
  tasks: Record<string, PipelineTaskDef>
  dependencies: Record<string, string[]>
  deps: Record<string, string>
}
