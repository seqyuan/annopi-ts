import type { ProjectConfig } from '../model/project'

function asRecordArray(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is Record<string, unknown> => (
    typeof item === 'object' && item !== null && !Array.isArray(item)
  ))
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

export function parseProjectConfig(raw: Record<string, unknown>): ProjectConfig {
  const cmpRaw = raw.cmp
  let comparisons: Array<Record<string, unknown>> = []

  if (Array.isArray(cmpRaw)) {
    comparisons = asRecordArray(cmpRaw)
  } else if (typeof cmpRaw === 'object' && cmpRaw !== null) {
    comparisons = asRecordArray((cmpRaw as Record<string, unknown>).group)
  }

  return {
    raw,
    samples: asRecordArray(raw.sample),
    comparisons,
    params: asRecord(raw.Para),
    combines: asStringArray(raw.Combine),
  }
}
