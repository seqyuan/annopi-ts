import { fileURLToPath } from 'node:url'
import { Command } from 'commander'
import { confCommand } from './commands/conf'
import { installCommand } from './commands/install'
import { runCommand } from './commands/run'

export function createCli(): Command {
  const program = new Command()

  program
    .name('annopi')
    .description('annopi-ts pipeline workflow engine')
    .version('0.1.0')

  program
    .command('conf')
    .description('Generate shell scripts and tasks.yml from pipeline/project configs')
    .requiredOption('-p, --pipeline <path>', 'Path to pipeline.yml')
    .requiredOption('-c, --project <path>', 'Path to project.yml')
    .requiredOption('-o, --outdir <path>', 'Output directory')
    .action(async (options: { pipeline: string; project: string; outdir: string }) => {
      const exitCode = await confCommand(options)
      process.exit(exitCode)
    })

  program
    .command('run')
    .description('Execute tasks from an existing tasks.yml')
    .requiredOption('-o, --outdir <path>', 'Output directory containing tasks.yml')
    .action(async (options: { outdir: string }) => {
      const exitCode = await runCommand(options)
      process.exit(exitCode)
    })

  program
    .command('install <source>')
    .description('Install or update a task module')
    .option('--update', 'Update an existing module checkout')
    .action(async (source: string, options: { update?: boolean }) => {
      const installOptions: { source: string; update?: boolean } = { source }
      if (options.update !== undefined) installOptions.update = options.update
      const exitCode = await installCommand(installOptions)
      process.exit(exitCode)
    })

  return program
}

export async function main(argv = process.argv): Promise<void> {
  const program = createCli()
  await program.parseAsync(argv)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void main()
}
