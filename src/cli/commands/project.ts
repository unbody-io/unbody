import { Command } from 'commander'
import inquirer from 'inquirer'
import * as Client from '../../client'
import * as crypto from 'node:crypto'

const client = Client.create({
  baseURL: 'http://localhost:3000',
})

const project = client.admin.project

export async function destroyProject() {
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message:
        'Are you sure you want to delete this project? This action cannot be undone.',
      default: false,
    },
  ])

  if (!confirm) {
    console.log('Project deletion cancelled.')
    process.exit(0)
  }

  const { keepSources } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'keepSources',
      message:
        'Would you like to keep the sources associated with this project?',
      default: true,
    },
  ])

  try {
    await project.delete({ keepSources, exit: true })
    console.log('Project deleted successfully.')
  } catch (error) {
    // If the error is a socket hang up, it's expected as the server exits
    if (error instanceof Error && error.message.includes('socket hang up')) {
      console.log('Project deleted successfully.')
      process.exit(0)
    }
    console.error('Failed to delete project:', error.message)
    process.exit(1)
  }
}
