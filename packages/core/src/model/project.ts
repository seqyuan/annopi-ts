export interface ProjectConfig {
  raw: Record<string, unknown>
  samples: Array<Record<string, unknown>>
  comparisons: Array<Record<string, unknown>>
  params: Record<string, unknown>
  combines: string[]
}
