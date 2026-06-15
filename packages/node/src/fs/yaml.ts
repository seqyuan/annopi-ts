import { readFile, writeFile } from 'node:fs/promises'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'

export async function readYamlFile<T>(path: string): Promise<T> {
  const content = await readFile(path, 'utf-8')
  return parseYaml(content) as T
}

export async function writeYamlFile(path: string, data: unknown): Promise<void> {
  const content = stringifyYaml(data)
  await writeFile(path, content.endsWith('\n') ? content : `${content}\n`, 'utf-8')
}
