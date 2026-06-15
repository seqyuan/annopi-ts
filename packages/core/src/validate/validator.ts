export interface ValidationIssue {
  level: 'error' | 'warning' | 'check'
  message: string
}

export interface ValidationResult {
  issues: ValidationIssue[]
  hasErrors: boolean
}

const DEPS_PATTERN = /\$\{deps\.(\w+)\}/g
const CONFIG_PATTERN = /\$\{config\.([^}]+)\}/g
const SAMPLE_PATTERN = /\$\{sample\.(\w+)\}/g

function collectPatternMatches(text: string, pattern: RegExp, group = 1): string[] {
  const matches: string[] = []
  const scoped = new RegExp(pattern.source, pattern.flags)
  for (const match of text.matchAll(scoped)) {
    const value = match[group]
    if (value) matches.push(value)
  }
  return matches
}

function configPathExists(projectRaw: Record<string, unknown>, dotpath: string): boolean {
  const parts = dotpath.split('.')
  let current: unknown = projectRaw
  for (const part of parts) {
    if (typeof current !== 'object' || current === null || Array.isArray(current)) {
      return false
    }
    if (!(part in (current as Record<string, unknown>))) {
      return false
    }
    current = (current as Record<string, unknown>)[part]
  }
  return true
}

export function validateTaskFormat(
  taskName: string,
  taskDef: Record<string, unknown>,
): ValidationIssue[] {
  const command = taskDef.command
  if (typeof command !== 'string' || command.trim() === '') {
    return [{
      level: 'error',
      message: `task '${taskName}': missing required field 'command'`,
    }]
  }
  return []
}

export function validateDepsDeclared(
  command: string,
  params: Record<string, string>,
  deps: Record<string, string>,
): ValidationIssue[] {
  const undeclared = new Set<string>()

  for (const depName of collectPatternMatches(command, DEPS_PATTERN)) {
    if (!(depName in deps)) undeclared.add(depName)
  }

  for (const value of Object.values(params)) {
    for (const depName of collectPatternMatches(value, DEPS_PATTERN)) {
      if (!(depName in deps)) undeclared.add(depName)
    }
  }

  return [...undeclared].map(depName => ({
    level: 'error' as const,
    message: `\${deps.${depName}} is not declared`,
  }))
}

export function validateConfigRefs(
  command: string,
  params: Record<string, string>,
  projectRaw: Record<string, unknown>,
): ValidationIssue[] {
  const invalid = new Set<string>()

  for (const dotpath of collectPatternMatches(command, CONFIG_PATTERN)) {
    if (!configPathExists(projectRaw, dotpath)) invalid.add(dotpath)
  }

  for (const value of Object.values(params)) {
    for (const dotpath of collectPatternMatches(value, CONFIG_PATTERN)) {
      if (!configPathExists(projectRaw, dotpath)) invalid.add(dotpath)
    }
  }

  return [...invalid].map(dotpath => ({
    level: 'error' as const,
    message: `\${config.${dotpath}} field not found`,
  }))
}

export function validateSampleRefs(
  command: string,
  params: Record<string, string>,
  samples: Array<Record<string, unknown>>,
): ValidationIssue[] {
  const invalid = new Set<string>()

  const fieldExists = (field: string): boolean => (
    samples.some(sample => field in sample)
  )

  for (const field of collectPatternMatches(command, SAMPLE_PATTERN)) {
    if (!fieldExists(field)) invalid.add(field)
  }

  for (const value of Object.values(params)) {
    for (const field of collectPatternMatches(value, SAMPLE_PATTERN)) {
      if (!fieldExists(field)) invalid.add(field)
    }
  }

  return [...invalid].map(field => ({
    level: 'error' as const,
    message: `\${sample.${field}} field not found in any sample`,
  }))
}

export function collectValidationIssues(
  issues: ValidationIssue[],
): ValidationResult {
  return {
    issues,
    hasErrors: issues.some(issue => issue.level === 'error'),
  }
}
