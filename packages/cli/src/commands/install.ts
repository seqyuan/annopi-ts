import { Installer } from '@seqyuan/annopi-node'
import { formatRuntimeError } from '../format/errors'
import type { InstallOptions } from '../types/options'

export async function installCommand(options: InstallOptions): Promise<number> {
  try {
    const installer = new Installer()
    const message = await installer.install(options.source, options.update ?? false)
    console.log(message)
    return 0
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(formatRuntimeError(message))
    return 1
  }
}
