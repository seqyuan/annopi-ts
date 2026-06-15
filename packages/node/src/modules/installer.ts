import { cp, mkdir, readdir, stat, symlink, unlink, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { promisify } from 'node:util'
import type { ModuleRef } from './namespace-resolver'
import { NamespaceResolver } from './namespace-resolver'

const execFileAsync = promisify(execFile)

export class Installer {
  private readonly namespaceResolver: NamespaceResolver

  constructor(namespaceResolver = new NamespaceResolver()) {
    this.namespaceResolver = namespaceResolver
  }

  async install(source: string, update = false): Promise<string> {
    const ref = this.namespaceResolver.parse(source)

    if (ref.isLocal) {
      return this.installLocal(ref)
    }

    return this.installGit(ref, update)
  }

  private async installLocal(ref: ModuleRef): Promise<string> {
    const src = ref.localPath
    try {
      await stat(src)
    } catch {
      throw new Error(`Local path not found: ${src}`)
    }

    return `Local module registered: ${src}`
  }

  private async installGit(ref: ModuleRef, update: boolean): Promise<string> {
    const installDir = this.namespaceResolver.getInstallDir(ref)

    try {
      await stat(installDir)
      if (!update) {
        return `Already installed: ${installDir}`
      }
    } catch {
      // not installed yet
    }

    const pathParts = ref.path.split('/')
    const repoUrl = `https://${ref.host}/${pathParts.slice(0, 2).join('/')}.git`
    const taskSubpath = pathParts.slice(2).join('/')
    const tmpdirPath = await mkdtemp(join(tmpdir(), 'annopi-install-'))

    try {
      await execFileAsync('git', ['clone', '--depth', '1', repoUrl, tmpdirPath])

      if (ref.version !== 'latest') {
        await execFileAsync('git', ['-C', tmpdirPath, 'checkout', ref.version])
      }

      const src = taskSubpath ? join(tmpdirPath, taskSubpath) : tmpdirPath
      await mkdir(installDir, { recursive: true })

      for (const item of await readdir(src)) {
        const from = join(src, item)
        const to = join(installDir, item)
        await cp(from, to, { recursive: true, force: true })
      }
    } finally {
      await rm(tmpdirPath, { recursive: true, force: true })
    }

    if (ref.version !== 'latest') {
      const latestLink = join(installDir, '..', 'latest')
      try {
        await unlink(latestLink)
      } catch {
        // ignore missing symlink
      }
      await symlink(ref.version, latestLink)
    }

    return `Installed: ${ref.host}/${ref.path}@${ref.version} -> ${installDir}`
  }
}
