#!/usr/bin/env node

import { Command } from 'commander'
import { addSource, listSources, deleteSource, rebuildSource } from './commands/source'
import { destroyProject } from './commands/project'

const program = new Command()

program
  .name('unbody')
  .description('CLI for managing Unbody sources')
  .version('0.0.1')

// Source commands
program
  .command('source')
  .description('Manage sources')
  .addCommand(listSources)
  .addCommand(addSource)
  .addCommand(deleteSource)
  .addCommand(rebuildSource)

// Project commands
program
  .command('destroy')
  .description('Delete the default project')
  .action(destroyProject)

program.parse()
