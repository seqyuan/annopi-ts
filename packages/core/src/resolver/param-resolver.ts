import { parseProjectConfig } from '../config/project'
import { CMP_SAMPLES_PATTERN, CROSS_REF_PATTERN, PARAM_PATTERN } from './patterns'

export type ExpandMode = 'single' | 'sample' | 'cmp'

export class ParamResolver {
  private readonly projectRaw: Record<string, unknown>
  private readonly deps: Record<string, string>
  private readonly samples: Array<Record<string, unknown>>
  private readonly comparisons: Array<Record<string, unknown>>
  private currentGroupBy = ''

  constructor(
    projectRaw: Record<string, unknown>,
    deps: Record<string, string> = {},
  ) {
    this.projectRaw = projectRaw
    this.deps = deps
    const project = parseProjectConfig(projectRaw)
    this.samples = project.samples
    this.comparisons = project.comparisons
  }

  resolveString(input: string): string {
    return input.replace(PARAM_PATTERN, (match, dotpath: string) => {
      const path = dotpath.trim()
      if (path.startsWith('config.')) {
        return this.lookupConfig(path)
      }
      if (path.startsWith('deps.')) {
        const depName = path.slice('deps.'.length)
        if (!(depName in this.deps)) {
          throw new Error(`Undeclared deps reference: \${${path}}`)
        }
        return this.deps[depName]!
      }
      return match
    })
  }

  detectMode(
    params: Record<string, string>,
    command = '',
  ): ExpandMode {
    const allValues = [...Object.values(params), command].join(' ')
    const hasSample = allValues.includes('${sample.') || allValues.includes('${sample[')
    const hasCmp = allValues.includes('${cmp.')

    if (hasSample && hasCmp) {
      throw new Error('Cannot mix ${sample.*} and ${cmp.*} in same task')
    }
    if (hasSample) return 'sample'
    if (hasCmp) return 'cmp'
    return 'single'
  }

  expand(
    params: Record<string, string>,
    options: {
      groupBy?: string
      command?: string
    } = {},
  ): Array<Record<string, string>> {
    const mode = this.detectMode(params, options.command ?? '')
    this.currentGroupBy = options.groupBy ?? ''

    if (mode === 'single') {
      const resolved: Record<string, string> = {}
      for (const [key, value] of Object.entries(params)) {
        resolved[key] = this.resolveString(value)
      }
      return [resolved]
    }

    if (mode === 'sample') {
      const groups = this.currentGroupBy
        ? this.groupSamples(this.currentGroupBy)
        : {}
      const results: Array<Record<string, string>> = []

      for (const sample of this.samples) {
        const rawValues: Record<string, string> = { ...params }
        if (options.command) {
          rawValues.__annopi_command__ = options.command
        }

        const resolved: Record<string, string> = {}
        let skip = false

        for (const [key, value] of Object.entries(rawValues)) {
          let current = this.resolveString(value)
          current = this.resolveOptionalBlocks(current, sample, 'sample')

          if (this.currentGroupBy && CROSS_REF_PATTERN.test(current)) {
            const crossResolved = this.resolveCrossRefs(current, sample, groups)
            if (crossResolved === null) {
              skip = true
              break
            }
            current = crossResolved
          }

          current = current.replace(PARAM_PATTERN, (match, dotpath: string) => {
            const path = dotpath.trim()
            if (path.startsWith('sample.')) {
              const field = path.slice('sample.'.length)
              const sampleValue = sample[field]
              return sampleValue === undefined ? match : String(sampleValue)
            }
            return match
          })

          resolved[key] = current
        }

        if (!skip) results.push(resolved)
      }

      return results
    }

    if (mode === 'cmp') {
      const results: Array<Record<string, string>> = []

      for (const comparison of this.comparisons) {
        const rawValues: Record<string, string> = { ...params }
        if (options.command) {
          rawValues.__annopi_command__ = options.command
        }

        const resolved: Record<string, string> = {}

        for (const [key, value] of Object.entries(rawValues)) {
          let current = this.resolveString(value)
          current = this.resolveOptionalBlocks(current, comparison, 'cmp')
          current = this.resolveCmpSamples(current, comparison)
          current = current.replace(PARAM_PATTERN, (match, dotpath: string) => {
            const path = dotpath.trim()
            if (path.startsWith('cmp.')) {
              const field = path.slice('cmp.'.length)
              if (field.startsWith('case_samples.') || field.startsWith('control_samples.')) {
                return match
              }
              const cmpValue = comparison[field]
              return cmpValue === undefined ? match : String(cmpValue)
            }
            return match
          })
          resolved[key] = current
        }

        results.push(resolved)
      }

      return results
    }

    return []
  }

  renderCommand(
    command: string,
    resolvedParams: Record<string, string>,
  ): string {
    let result = resolvedParams.__annopi_command__ ?? command

    for (const [key, value] of Object.entries(resolvedParams)) {
      if (key.startsWith('__annopi_')) continue
      result = result.replaceAll(`\${${key}}`, value)
    }

    return this.resolveString(result)
  }

  private lookupConfig(dotpath: string): string {
    if (!dotpath.startsWith('config.')) {
      throw new Error(`Unknown config root: ${dotpath.split('.')[0]}`)
    }

    let current: unknown = this.projectRaw
    for (const part of dotpath.slice('config.'.length).split('.')) {
      if (typeof current !== 'object' || current === null || Array.isArray(current)) {
        throw new Error(`Invalid config path: ${dotpath}`)
      }
      current = (current as Record<string, unknown>)[part]
    }

    return String(current)
  }

  private resolveOptionalBlocks(
    text: string,
    data: Record<string, unknown>,
    prefix: string,
  ): string {
    const result: string[] = []
    let index = 0

    while (index < text.length) {
      const match = text.slice(index).match(/^\$\{(\w+)\.(\w+)\?\s+/)
      if (match) {
        const blockPrefix = match[1]!
        const field = match[2]!
        if (blockPrefix === prefix) {
          const start = index + match[0].length
          let depth = 1
          let cursor = start

          while (cursor < text.length && depth > 0) {
            if (text.slice(cursor, cursor + 2) === '${') {
              depth += 1
              cursor += 2
              continue
            }
            if (text[cursor] === '}') {
              depth -= 1
              cursor += 1
              continue
            }
            cursor += 1
          }

          if (depth === 0) {
            const content = text.slice(start, cursor - 1)
            if (data[field]) {
              result.push(content)
            }
            index = cursor
            continue
          }
        }
      }

      result.push(text[index]!)
      index += 1
    }

    return result.join('')
  }

  private resolveCrossRefs(
    text: string,
    currentSample: Record<string, unknown>,
    groups: Record<string, Array<Record<string, unknown>>>,
  ): string | null {
    let unresolved = false

    const result = text.replace(CROSS_REF_PATTERN, (match, filterField: string, filterValue: string, targetField: string) => {
      const groupKey = this.getGroupValue(currentSample)
      const groupSamples = groups[groupKey] ?? []

      for (const sample of groupSamples) {
        if (
          String(sample[filterField] ?? '') === filterValue
          && sample !== currentSample
        ) {
          return String(sample[targetField] ?? '')
        }
      }

      unresolved = true
      return match
    })

    return unresolved ? null : result
  }

  private resolveCmpSamples(text: string, comparison: Record<string, unknown>): string {
    return text.replace(CMP_SAMPLES_PATTERN, (_match, which: string, field: string) => {
      const side = which === 'case_samples' ? 'case' : 'control'
      const matched = this.findCmpSamples(comparison, side)
      return matched.map(sample => String(sample[field] ?? '')).join(',')
    })
  }

  private findCmpSamples(
    comparison: Record<string, unknown>,
    side: string,
  ): Array<Record<string, unknown>> {
    const value = comparison[side]
    const byField = comparison.by

    if (byField) {
      return this.samples.filter(
        sample => String(sample[String(byField)] ?? '') === String(value),
      )
    }

    if (Array.isArray(value)) {
      return this.samples.filter(
        sample => value.includes(sample.sample_name),
      )
    }

    return []
  }

  private groupSamples(groupBy: string): Record<string, Array<Record<string, unknown>>> {
    const groups: Record<string, Array<Record<string, unknown>>> = {}
    for (const sample of this.samples) {
      const key = String(sample[groupBy] ?? '')
      groups[key] ??= []
      groups[key].push(sample)
    }
    return groups
  }

  private getGroupValue(sample: Record<string, unknown>): string {
    if (!this.currentGroupBy) return ''
    return String(sample[this.currentGroupBy] ?? '')
  }
}
