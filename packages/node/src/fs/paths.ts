export interface OutputPaths {
  outdir: string
  shellDir: string
  tasksPath: string
}

export function resolveOutputPaths(outdir: string): OutputPaths {
  const normalized = outdir.replace(/\/$/, '')
  return {
    outdir: normalized,
    shellDir: `${normalized}/shell`,
    tasksPath: `${normalized}/tasks.yml`,
  }
}
