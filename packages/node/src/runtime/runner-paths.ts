import { access, constants } from 'node:fs/promises'
import { join } from 'node:path'

const DEFAULT_ATA_PATH = '/Volumes/data/GOPATH/bin/ata'
const DEFAULT_ANNOTASK_PATH = '/Volumes/data/GOPATH/bin/annotask'

export interface RunnerPaths {
  /** Local executor: ata or annotask (both accept `-i -l -t`). */
  localRunner: string
  /** Cluster executor binary; qsubsge appends the `qsubsge` subcommand. */
  annotaskRunner: string
}

async function isExecutable(path: string): Promise<boolean> {
  try {
    await access(path, constants.X_OK)
    return true
  } catch {
    return false
  }
}

async function resolveFromPath(name: string): Promise<string | undefined> {
  for (const entry of process.env.PATH?.split(':') ?? []) {
    const candidate = join(entry, name)
    if (await isExecutable(candidate)) return candidate
  }
  return undefined
}

async function resolveDefaultAta(): Promise<string> {
  if (await isExecutable(DEFAULT_ATA_PATH)) return DEFAULT_ATA_PATH
  return (await resolveFromPath('ata')) ?? 'ata'
}

async function resolveDefaultAnnotask(): Promise<string> {
  if (await isExecutable(DEFAULT_ANNOTASK_PATH)) return DEFAULT_ANNOTASK_PATH
  return (await resolveFromPath('annotask')) ?? 'annotask'
}

/**
 * Resolve global runner paths from merged pipeline deps.
 *
 * - local mode: `${localRunner} -i script -l N -t M` (no `local` subcommand)
 * - qsubsge mode: `${annotaskRunner} qsubsge -i script ...`
 *
 * ata and annotask are interchangeable for local mode because both expose
 * the same `-i/-l/-t` interface; annotask defaults to local when no module
 * is specified.
 */
export async function resolveRunnerPaths(
  deps: Record<string, string> = {},
): Promise<RunnerPaths> {
  const defaultAta = await resolveDefaultAta()
  const defaultAnnotask = await resolveDefaultAnnotask()

  const localRunner = deps.ata ?? deps.annotask ?? defaultAta
  const annotaskRunner = deps.annotask ?? defaultAnnotask

  return { localRunner, annotaskRunner }
}
