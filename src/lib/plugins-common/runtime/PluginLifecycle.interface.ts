import { PluginContext } from '.'

export interface PluginLifecycle<
  C extends PluginContext = PluginContext,
  T extends Record<string, any> = Record<string, any>,
> {
  /**
   * Called immediately after each time the plugin is loaded.
   * Use this method to load and validate configurations,
   * and to perform any setup that does not require external resources.
   */
  initialize: (config: T) => Promise<void>

  /**
   * Called the first time the plugin is ever loaded.
   * Use this method to perform one-time setup tasks.
   */
  bootstrap: (ctx: C) => Promise<void>

  /**
   * Called when the plugin is launched in service mode.
   * Use this method to start any background tasks.
   */
  startService?: (ctx: C) => Promise<void>

  /**
   * Called before the plugin running in service mode is stopped.
   * Use this method to gracefully stop background tasks.
   */
  stopService?: (ctx: C) => Promise<void>

  /**
   * Called when the plugin is being uninstalled.
   * Use this method to clean up any resources, such as database collections,
   * external registries, etc.
   */
  destroy: (ctx: C) => Promise<void>
}
