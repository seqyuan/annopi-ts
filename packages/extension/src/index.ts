import type { RunPipelineResult } from '@seqyuan/annopi-node'

/**
 * Placeholder extension API for annovibe integration.
 * V1 only defines the surface; implementation follows workflow wiring.
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
  }>

  run(options: { outdir: string }): Promise<RunPipelineResult>
}

export function createAnnopiExtension(): AnnopiExtensionApi {
  throw new Error('createAnnopiExtension() is not implemented')
}
