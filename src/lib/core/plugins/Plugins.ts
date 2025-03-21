import { PluginRegistry } from 'src/lib/plugins/registry/PluginRegistry'
import { PluginResources } from 'src/lib/plugins/resources/PluginResources'
import { ProjectContext } from '../project-context'

export class Plugins {
  constructor(
    private _ctx: ProjectContext,
    public registry: PluginRegistry,
    public resources: PluginResources,
  ) {}
}
