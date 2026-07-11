import type { ValidationIssue } from '@seqyuan/annopi-core'
import type { RunPipelineResult } from '@seqyuan/annopi-node'
import { AnnopiWorkflow, ConfValidationError, runPipeline } from '@seqyuan/annopi-node'

/**
 * Extension API for annovibe/OpenVibe integration.
 *
 * Wraps AnnopiWorkflow so OpenVibe can call annopi-ts directly
 * as a TypeScript API instead of shelling out to the annopi CLI.
 */
export interface AnnopiExtensionApi {
  conf(options: {
    pipelinePath: string
    projectPath: string
    outdir: string
  }): Promise<{
    pipelineName: string
    outdir: string
    shellDir: string
    tasksPath: string
    taskCount: number
    issues: ValidationIssue[]
  }>

  run(options: { outdir: string }): Promise<RunPipelineResult>
}

/**
 * Create an annopi extension instance wired to the local filesystem.
 *
 * OpenVibe uses this on the worker machine to execute pipeline
 * conf/run via the annopi-ts TypeScript runtime.
 *
 * @throws {ConfValidationError} when configuration validation fails
 */
export function createAnnopiExtension(): AnnopiExtensionApi {
  return {
    async conf(options) {
      const workflow = new AnnopiWorkflow({
        pipelinePath: options.pipelinePath,
        projectPath: options.projectPath,
        outdir: options.outdir,
      })
      const result = await workflow.conf()
      return {
        pipelineName: result.pipelineName,
        outdir: result.outdir,
        shellDir: result.shellDir,
        tasksPath: result.tasksPath,
        taskCount: result.taskCount,
        issues: result.issues,
      }
    },

    async run(options) {
      return runPipeline({ outdir: options.outdir })
    },
  }
}

export { ConfValidationError }
export type { ValidationIssue }
