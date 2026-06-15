export interface ConfOptions {
  pipeline: string
  project: string
  outdir: string
}

export interface RunOptions {
  outdir: string
}

export interface InstallOptions {
  source: string
  update?: boolean
}
