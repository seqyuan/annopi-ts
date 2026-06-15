import { runPipeline } from '@seqyuan/annopi-node'
import { formatRuntimeError } from '../format/errors'
import type { RunOptions } from '../types/options'

export async function runCommand(options: RunOptions): Promise<number> {
  try {
    const result = await runPipeline({ outdir: options.outdir })

    if (result.alreadyDone) {
      console.log('All tasks already done.')
      return 0
    }

    if (result.failed.length > 0) {
      console.log(`Pipeline stopped. Failed: ${result.failed.join(', ')}`)
      return 1
    }

    console.log('All tasks completed successfully.')
    return 0
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(formatRuntimeError(message))
    return 1
  }
}
