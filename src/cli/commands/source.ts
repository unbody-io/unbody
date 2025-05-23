import { Command } from 'commander'
import inquirer from 'inquirer'
import * as Client from '../../client'
import * as fs from 'node:fs'

const client = Client.create({
  baseURL: 'http://localhost:3000',
})

const project = client.admin.project

export const listSources = new Command('list')
  .description('List all sources')
  .action(async () => {
    try {
      const sources = await project.source.list()
      console.log('\nSources:')
      console.log(sources)
    } catch (error) {
      console.error(
        'Error listing sources:',
        error instanceof Error ? error.message : 'Unknown error',
      )
      process.exit(1)
    }
  })

export const addSource = new Command('add')
  .description('Add a new source interactively')
  .action(async () => {
    console.log(
      'Currently we only support creating data sources from local directories.',
    )
    try {
      const { directory } = await inquirer.prompt([
        {
          type: 'input',
          name: 'directory',
          message:
            'Enter the absolute path of the directory you want to index:',
          validate: (input) =>
            fs.existsSync(input) || 'Directory does not exist',
        },
      ])

      const { name } = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Enter the name of the source:',
          default: directory.replaceAll('/', '-'),
          validate: (input) => input.length > 0 || 'Name is required',
        },
      ])

      const sourceResponse = await project.source.create({
        provider: 'provider-local-folder',
        name,
      })

      await project.source.connect(sourceResponse.id, {
        state: {},
        redirectUrl: 'https://any.com',
      })

      await project.source.verifyConnection(sourceResponse.id, {
        payload: {},
      })

      await project.source.setEntrypoint(sourceResponse.id, {
        entrypoint: {
          type: 'form',
          fields: {
            directory,
          },
        },
      })

      await project.source.indexing.init(sourceResponse.id)

      console.log('Source added successfully! 🎉')
      console.log(
        'Check the temporal dashboard to see your files being indexed:',
      )
      console.log('http://localhost:8233/')
    } catch (error) {
      console.error(
        'Error adding source:',
        error instanceof Error ? error.message : 'Unknown error',
      )
      process.exit(1)
    }
  })

export const deleteSource = new Command('delete')
  .description('Delete a source')
  .action(async () => {
    try {
      const sources = await project.source.list()
      console.log(sources)
      const choices = sources.map((source) => ({
        name: source.name,
        value: source.id,
      }))

      const { sourceId } = await inquirer.prompt([
        {
          type: 'list',
          name: 'sourceId',
          message: 'Select the source you want to delete:',
          choices,
        },
      ])

      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Are you sure you want to delete this source?',
          default: false,
        },
      ])

      if (confirm) {
        await project.source.delete(sourceId)
        console.log('Source deleted successfully!')
      } else {
        console.log('Deletion cancelled.')
      }
    } catch (error) {
      console.error(
        'Error deleting source:',
        error instanceof Error ? error.message : 'Unknown error',
      )
      process.exit(1)
    }
  })

export const rebuildSource = new Command('rebuild')
  .description('Rebuild a source index')
  .action(async () => {
    try {
      const sources = await project.source.list()
      if (sources.length === 0) {
        console.log('No sources found.')
        process.exit(1)
      }
      const choices = sources.map((source) => ({
        name: source.name,
        value: source.id,
      }))

      const { sourceId } = await inquirer.prompt([
        {
          type: 'list',
          name: 'sourceId',
          message: 'Select the source you want to rebuild:',
          choices,
        },
      ])

      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message:
            'Are you sure you want to rebuild this source? This will reindex all files.',
          default: false,
        },
      ])

      if (confirm) {
        console.log('Rebuilding source...')
        await project.source.indexing.rebuild(sourceId)
        console.log('Source rebuild initiated successfully!')
        console.log(
          'Check the temporal dashboard to see your files being indexed:',
        )
        console.log('http://localhost:8233/')
      } else {
        console.log('Rebuild cancelled.')
      }
    } catch (error) {
      console.error(
        'Error rebuilding source:',
        error instanceof Error ? error.message : 'Unknown error',
      )
      process.exit(1)
    }
  })
