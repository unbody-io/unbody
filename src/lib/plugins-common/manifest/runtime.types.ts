export const PluginRuntimeModes = {
  Service: 'service' as 'service',
  Function: 'function' as 'function',
} as const

export type PluginRuntimeMode =
  (typeof PluginRuntimeModes)[keyof typeof PluginRuntimeModes]
