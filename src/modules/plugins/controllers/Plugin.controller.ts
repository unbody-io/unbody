import { Controller, Get, Param } from '@nestjs/common'
import { PluginType, PluginTypes } from 'src/lib/plugins-common'
import { PluginRegistry } from 'src/lib/plugins/registry/PluginRegistry'

@Controller('/plugins')
export class PluginController {
  constructor(private registry: PluginRegistry) {}

  @Get('/')
  async list() {
    return {
      plugins: await this.registry.getPlugins(),
    }
  }

  @Get('/:type')
  async getByType(@Param('type') type: PluginType) {
    return {
      plugins: await this.registry.getPlugins(type),
    }
  }

  @Get('/types')
  async types() {
    return {
      types: Object.values(PluginTypes),
    }
  }
}
