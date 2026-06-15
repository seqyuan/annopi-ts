import type { PipelineConfig, PipelineTaskDef } from '../model/pipeline'

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function asStringRecord(value: unknown): Record<string, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {}
  const result: Record<string, string> = {}
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === 'string') result[key] = item
  }
  return result
}

function asTaskMap(value: unknown): Record<string, PipelineTaskDef> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {}
  return value as Record<string, PipelineTaskDef>
}

function asDependencyMap(value: unknown): Record<string, string[]> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {}
  const result: Record<string, string[]> = {}
  for (const [key, item] of Object.entries(value)) {
    result[key] = asStringArray(item)
  }
  return result
}

export function parsePipelineConfig(raw: Record<string, unknown>): PipelineConfig {
  return {
    name: asString(raw.name),
    version: asString(raw.version),
    imports: asStringArray(raw.imports),
    tasks: asTaskMap(raw.tasks),
    dependencies: asDependencyMap(raw.dependencies),
    deps: asStringRecord(raw.deps),
  }
}
