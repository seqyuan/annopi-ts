import { describe, expect, it } from 'vitest'
import { createCli } from '../src/cli'

describe('createCli', () => {
  it('registers conf, run, and install commands', () => {
    const program = createCli()
    const names = program.commands.map(command => command.name())

    expect(names).toEqual(['conf', 'run', 'install'])
  })
})
