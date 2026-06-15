import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { TaskLoader } from '../../src/loader/task-loader'

describe('TaskLoader', () => {
  it('merges import, path, and inline task priorities', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'annopi-loader-'))
    const projectDir = join(dir, 'project')
    const moduleDir = join(projectDir, 'tasks', 'qc')
    await mkdir(moduleDir, { recursive: true })
    await writeFile(join(moduleDir, 'task.yml'), 'name: qc\ncommand: fastqc\n', 'utf-8')

    const inlineDir = join(projectDir, 'inline-task')
    await mkdir(inlineDir, { recursive: true })
    await writeFile(join(inlineDir, 'task.yml'), 'name: ignored\ncommand: inline-base\n', 'utf-8')

    const loader = new TaskLoader({
      imports: ['github.com/demo/qc'],
      projectTasksDir: projectDir,
      inlineTasks: {
        from_path: {
          path: 'inline-task',
          command: 'inline-override',
        },
        pure_inline: {
          command: 'echo inline',
        },
      },
    })

    const tasks = await loader.loadAll()
    expect(tasks.qc?.command).toBe('fastqc')
    expect(tasks.from_path?.command).toBe('inline-override')
    expect(tasks.pure_inline?.command).toBe('echo inline')
  })

  it('collects deps with pipeline overrides', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'annopi-deps-'))
    const projectDir = join(dir, 'project')
    const moduleDir = join(projectDir, 'tasks', 'qc')
    await mkdir(moduleDir, { recursive: true })
    await writeFile(
      join(moduleDir, 'task.yml'),
      'name: qc\ncommand: fastqc\ndeps:\n  - name: fastqc\n    default: /usr/bin/fastqc\n',
      'utf-8',
    )

    const loader = new TaskLoader({
      imports: ['github.com/demo/qc'],
      projectTasksDir: projectDir,
      inlineTasks: {},
    })

    const { mergedDeps, sourceMap } = await loader.collectDeps({
      fastqc: '/custom/fastqc',
    })

    expect(mergedDeps.fastqc).toBe('/custom/fastqc')
    expect(sourceMap.fastqc).toBe('pipeline.yml')
  })
})
