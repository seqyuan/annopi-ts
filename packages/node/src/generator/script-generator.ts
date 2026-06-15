import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export class ScriptGenerator {
  private readonly shellDir: string

  constructor(shellDir: string) {
    this.shellDir = shellDir
  }

  async generateTaskScript(
    numberedName: string,
    commands: string[],
  ): Promise<string> {
    await mkdir(this.shellDir, { recursive: true })
    const scriptPath = join(this.shellDir, `${numberedName}.sh`)
    const content = `${commands.join('\n')}\n`
    await writeFile(scriptPath, content, 'utf-8')
    return scriptPath
  }
}
