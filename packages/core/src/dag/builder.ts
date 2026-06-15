export class DAGBuilder {
  private readonly tasks: string[]
  private readonly dependencies: Record<string, string[]>
  private readonly sorted: string[]
  private readonly levels: Record<string, number>

  constructor(
    tasks: string[],
    dependencies: Record<string, string[]>,
  ) {
    this.tasks = tasks
    this.dependencies = Object.fromEntries(
      tasks.map(task => [task, dependencies[task] ?? []]),
    )
    this.validateDependencies()
    this.sorted = this.buildTopologicalOrder()
    this.levels = this.buildLevels()
  }

  topologicalOrder(): string[] {
    return [...this.sorted]
  }

  getLevel(task: string): number {
    const level = this.levels[task]
    if (level === undefined) {
      throw new Error(`Unknown task: ${task}`)
    }
    return level
  }

  getDependencies(task: string): string[] {
    return [...(this.dependencies[task] ?? [])]
  }

  getNumberedNames(): Record<string, string> {
    const levelGroups = new Map<number, string[]>()

    for (const task of this.sorted) {
      const level = this.getLevel(task)
      const group = levelGroups.get(level) ?? []
      group.push(task)
      levelGroups.set(level, group)
    }

    const result: Record<string, string> = {}
    for (const [level, names] of [...levelGroups.entries()].sort(([a], [b]) => a - b)) {
      names.forEach((task, index) => {
        result[task] = `${level}-${index}-${task}`
      })
    }

    return result
  }

  private validateDependencies(): void {
    const allTasks = new Set(this.tasks)
    for (const [task, deps] of Object.entries(this.dependencies)) {
      for (const dep of deps) {
        if (!allTasks.has(dep)) {
          throw new Error(`Unknown dependency: ${dep} for task ${task}`)
        }
      }
    }
  }

  private buildTopologicalOrder(): string[] {
    const inDegree = new Map(this.tasks.map(task => [task, 0]))
    const adjacency = new Map(this.tasks.map(task => [task, [] as string[]]))

    for (const [task, deps] of Object.entries(this.dependencies)) {
      inDegree.set(task, deps.length)
      for (const dep of deps) {
        adjacency.get(dep)?.push(task)
      }
    }

    const queue = this.tasks.filter(task => (inDegree.get(task) ?? 0) === 0)
    const sorted: string[] = []

    while (queue.length > 0) {
      const node = queue.shift()
      if (!node) break
      sorted.push(node)

      for (const neighbor of adjacency.get(node) ?? []) {
        const nextDegree = (inDegree.get(neighbor) ?? 0) - 1
        inDegree.set(neighbor, nextDegree)
        if (nextDegree === 0) queue.push(neighbor)
      }
    }

    if (sorted.length !== this.tasks.length) {
      throw new Error('Cycle detected in task dependencies')
    }

    return sorted
  }

  private buildLevels(): Record<string, number> {
    const levels: Record<string, number> = {}

    for (const task of this.sorted) {
      const deps = this.dependencies[task] ?? []
      if (deps.length === 0) {
        levels[task] = 1
        continue
      }

      levels[task] = Math.max(...deps.map(dep => levels[dep] ?? 0)) + 1
    }

    return levels
  }
}
