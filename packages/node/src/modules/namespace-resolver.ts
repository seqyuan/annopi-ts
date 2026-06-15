import { homedir } from 'node:os'
import { join } from 'node:path'

export interface ModuleRef {
  host: string
  path: string
  version: string
  isLocal: boolean
  localPath: string
}

export class NamespaceResolver {
  static readonly DEFAULT_BASE = join(homedir(), '.annopi', 'tasks')

  private readonly baseDir: string

  constructor(baseDir = NamespaceResolver.DEFAULT_BASE) {
    this.baseDir = baseDir
  }

  parse(source: string): ModuleRef {
    if (source.startsWith('/') || source.startsWith('./') || source.startsWith('../')) {
      return {
        host: '',
        path: '',
        version: '',
        isLocal: true,
        localPath: source,
      }
    }

    let name = source
    let version = 'latest'
    const atIndex = source.lastIndexOf('@')
    if (atIndex >= 0) {
      name = source.slice(0, atIndex)
      version = source.slice(atIndex + 1)
    }

    const slashIndex = name.indexOf('/')
    const host = slashIndex >= 0 ? name.slice(0, slashIndex) : name
    const path = slashIndex >= 0 ? name.slice(slashIndex + 1) : ''

    return {
      host,
      path,
      version,
      isLocal: false,
      localPath: '',
    }
  }

  getInstallDir(ref: ModuleRef): string {
    if (ref.isLocal) return ref.localPath
    return join(this.baseDir, ref.host, ref.path, ref.version)
  }
}
