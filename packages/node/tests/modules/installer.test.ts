import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { Installer } from '../../src/modules/installer'

describe('Installer', () => {
  it('registers an existing local module path', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'annopi-install-local-'))
    const moduleDir = join(dir, 'task-module')
    await mkdir(moduleDir, { recursive: true })
    await writeFile(join(moduleDir, 'task.yml'), 'name: demo\ncommand: echo\n', 'utf-8')

    const installer = new Installer()
    const message = await installer.install(moduleDir)

    expect(message).toContain('Local module registered')
    expect(message).toContain(moduleDir)
  })

  it('fails for missing local module path', async () => {
    const installer = new Installer()
    await expect(
      installer.install('/tmp/annopi-missing-module-path'),
    ).rejects.toThrow('Local path not found')
  })
})
