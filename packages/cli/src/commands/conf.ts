import {
  AnnopiWorkflow,
  ConfValidationError,
  printValidationIssues,
} from '@seqyuan/annopi-node'
import { formatRuntimeError } from '../format/errors'
import type { ConfOptions } from '../types/options'

export async function confCommand(options: ConfOptions): Promise<number> {
  try {
    const workflow = new AnnopiWorkflow({
      pipelinePath: options.pipeline,
      projectPath: options.project,
      outdir: options.outdir,
    })

    const summary = await workflow.conf()
    printValidationIssues(summary.issues)
    console.log(`Generated ${summary.taskCount} task scripts in ${summary.shellDir}`)
    console.log(`Generated tasks.yml in ${summary.outdir}`)
    return 0
  } catch (error) {
    if (error instanceof ConfValidationError) {
      printValidationIssues(error.issues)
      return 1
    }

    const message = error instanceof Error ? error.message : String(error)
    console.error(formatRuntimeError(message))
    return 1
  }
}
