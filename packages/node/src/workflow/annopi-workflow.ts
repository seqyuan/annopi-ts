import { access, constants } from 'node:fs/promises'
import { dirname } from 'node:path'
import {
  collectValidationIssues,
  DAGBuilder,
  ParamResolver,
  parsePipelineConfig,
  parseProjectConfig,
  validateConfigRefs,
  validateDepsDeclared,
  validateSampleRefs,
  validateTaskFormat,
} from '@seqyuan/annopi-core'
import type { ValidationIssue } from '@seqyuan/annopi-core'
import { ScriptGenerator } from '../generator/script-generator'
import { TasksYmlGenerator } from '../generator/tasks-yml-generator'
import { TaskLoader } from '../loader/task-loader'
import { resolveOutputPaths } from '../fs/paths'
import { readYamlFile } from '../fs/yaml'
import type { RunPipelineResult } from '../runtime/run-pipeline'
import { runPipeline } from '../runtime/run-pipeline'
import { resolveRunnerPaths } from '../runtime/runner-paths'
import { ConfValidationError } from './conf-validation'

function asStringRecord(value: unknown): Record<string, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {}
  const result: Record<string, string> = {}
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === 'string') result[key] = item
  }
  return result
}

export class AnnopiWorkflow {
  private readonly pipelinePath: string
  private readonly projectPath: string
  private readonly outdir: string

  constructor(options: {
    pipelinePath: string
    projectPath: string
    outdir: string
  }) {
    this.pipelinePath = options.pipelinePath
    this.projectPath = options.projectPath
    this.outdir = options.outdir
  }

  async conf(): Promise<{
    pipelineName: string
    outdir: string
    shellDir: string
    tasksPath: string
    taskCount: number
    issues: ValidationIssue[]
  }> {
    const [pipelineRaw, projectRaw] = await Promise.all([
      readYamlFile<Record<string, unknown>>(this.pipelinePath),
      readYamlFile<Record<string, unknown>>(this.projectPath),
    ])

    const pipeline = parsePipelineConfig(pipelineRaw)
    const project = parseProjectConfig(projectRaw)
    const paths = resolveOutputPaths(this.outdir)
    const projectDir = dirname(this.projectPath)

    const loader = new TaskLoader({
      inlineTasks: pipeline.tasks as Record<string, Record<string, unknown>>,
      imports: pipeline.imports,
      projectTasksDir: projectDir,
    })

    const loadedTasks = await loader.loadAll()
    const { mergedDeps, sourceMap } = await loader.collectDeps(pipeline.deps)

    const issues: ValidationIssue[] = []
    for (const [taskName, taskDef] of Object.entries(loadedTasks)) {
      issues.push(...validateTaskFormat(taskName, taskDef))

      const command = typeof taskDef.command === 'string' ? taskDef.command : ''
      const params = asStringRecord(taskDef.params)

      for (const issue of validateDepsDeclared(command, params, mergedDeps)) {
        issues.push({
          level: 'error' as const,
          message: `task '${taskName}': ${issue.message}`,
        })
      }

      for (const issue of validateConfigRefs(command, params, project.raw)) {
        issues.push({
          level: 'error' as const,
          message: `task '${taskName}': ${issue.message}`,
        })
      }

      for (const issue of validateSampleRefs(command, params, project.samples)) {
        issues.push({
          level: 'error' as const,
          message: `task '${taskName}': ${issue.message}`,
        })
      }

      issues.push({
        level: 'check',
        message: `task '${taskName}' ... OK`,
      })
    }

    for (const [depName, depPath] of Object.entries(mergedDeps)) {
      const source = sourceMap[depName] ?? 'unknown'
      try {
        await access(depPath, constants.F_OK)
      } catch {
        issues.push({
          level: 'warning',
          message: `deps '${depName}': path not found: ${depPath} (from ${source})`,
        })
      }
      issues.push({
        level: 'check',
        message: `deps '${depName}' ... ${depPath} (from ${source})`,
      })
    }

    const validation = collectValidationIssues(issues)
    if (validation.hasErrors) {
      throw new ConfValidationError(issues)
    }

    const resolver = new ParamResolver(project.raw, mergedDeps)
    const taskNames = Object.keys(loadedTasks)
    const dag = new DAGBuilder(taskNames, pipeline.dependencies)
    const numberedNames = dag.getNumberedNames()

    const scriptGen = new ScriptGenerator(paths.shellDir)
    const runners = await resolveRunnerPaths(mergedDeps)
    const tasksYmlGen = new TasksYmlGenerator({ runners })

    const tasksMeta = []

    for (const [taskName, taskDef] of Object.entries(loadedTasks)) {
      const numberedName = numberedNames[taskName]
      if (!numberedName) {
        throw new Error(`Missing numbered name for task: ${taskName}`)
      }

      const params = asStringRecord(taskDef.params)
      const commandTemplate = typeof taskDef.command === 'string'
        ? taskDef.command.trim()
        : ''
      const resources = typeof taskDef.resources === 'object' && taskDef.resources !== null
        ? taskDef.resources as Record<string, unknown>
        : {}
      const annotask = typeof taskDef.annotask === 'object' && taskDef.annotask !== null
        ? taskDef.annotask as Record<string, unknown>
        : {}
      const groupBy = typeof taskDef.group_by === 'string' ? taskDef.group_by : undefined

      const resolvedAnnotaskOptions = Object.fromEntries(
        Object.entries(annotask).map(([key, value]) => [
          key,
          resolver.resolveString(String(value)),
        ]),
      )

      const expandOptions: { groupBy?: string; command?: string } = {
        command: commandTemplate,
      }
      if (groupBy !== undefined) expandOptions.groupBy = groupBy

      const expandedParamsList = resolver.expand(params, expandOptions)

      const commands = expandedParamsList.map(paramsEntry => (
        resolver.renderCommand(commandTemplate, paramsEntry)
      ))

      await scriptGen.generateTaskScript(numberedName, commands)

      const rawDeps = pipeline.dependencies[taskName] ?? []
      const numberedDeps = rawDeps.map(dep => {
        const numberedDep = numberedNames[dep]
        if (!numberedDep) {
          throw new Error(`Unknown dependency '${dep}' for task '${taskName}'`)
        }
        return numberedDep
      })

      tasksMeta.push({
        numberedName,
        resources,
        annotaskOptions: resolvedAnnotaskOptions,
        depends: numberedDeps,
      })
    }

    const tasksPath = await tasksYmlGen.generate(
      pipeline.name,
      tasksMeta,
      paths.shellDir,
      paths.outdir,
    )

    return {
      pipelineName: pipeline.name,
      outdir: paths.outdir,
      shellDir: paths.shellDir,
      tasksPath,
      taskCount: Object.keys(loadedTasks).length,
      issues,
    }
  }

  async run(): Promise<RunPipelineResult> {
    return runPipeline({ outdir: this.outdir })
  }
}
