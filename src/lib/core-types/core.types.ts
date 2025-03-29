import { CollectionConfig } from './collection'

export namespace CoreTypes {
  export namespace Plugins {
    export type Registration = {
      path: string
      alias: string
      config?:
        | Record<string, any>
        | (() => Record<string, any>)
        | (() => Promise<Record<string, any>>)
        | undefined
    }
  }

  export namespace ProjectSettings {
    export type ModuleConfig<
      T extends Record<string, any> = Record<string, any>,
    > = {
      name: string
      options?: T
    }

    export namespace Enhancement {
      export const key = 'enhancement' as const
      export const name = 'enhancement' as const

      type LiteralArg = {
        type: 'literal'
        value: any
      }

      type ComputedArg = {
        type: 'computed'
        value: string
      }

      export type ActionArg = LiteralArg | ComputedArg

      export type Step = {
        name: string
        action: {
          name: string
          args: Record<string, ActionArg>
        }
        output: Record<string, LiteralArg | ComputedArg>
        if?: string
        onFailure?: 'continue' | 'stop'
      }

      export type Pipeline = {
        name: string
        if?: string
        steps: Step[]
        collection: string
        vars?: Record<string, LiteralArg | ComputedArg>
      }

      export type Settings = {
        pipelines: Pipeline[]
      }
    }

    export type Document = {
      textVectorizer: ModuleConfig
      imageVectorizer?: ModuleConfig
      reranker?: ModuleConfig
      generative?: ModuleConfig
      enhancement?: Enhancement.Settings
      fileParsers: {
        [mimeType: string]: ModuleConfig | ModuleConfig[] | undefined
      }
      customSchema?: {
        collections: CollectionConfig[]
        extend?: CollectionConfig[]
      }
    }
  }

  export namespace Project {
    export const States = {
      Running: 'running' as 'running',

      Created: 'created' as 'created',
      Initializing: 'initializing' as 'initializing',

      Paused: 'paused' as 'paused',
      Pausing: 'pausing' as 'pausing',
      Restoring: 'restoring' as 'restoring',
    } as const

    export type State = (typeof States)[keyof typeof States]

    export type Document = {
      id: string
      name: string
      state: Project.State
      settings: ProjectSettings.Document

      createdAt: string
      updatedAt: string
      pausedAt?: string
      restoredAt?: string
    }
  }

  export namespace Source {
    export const States = {
      Idle: 'idle' as 'idle',
      Paused: 'paused' as 'paused',
      Updating: 'updating' as 'updating',
      Deleting: 'deleting' as 'deleting',
      Initializing: 'initializing' as 'initializing',
    }

    export type State = (typeof States)[keyof typeof States]

    export type Document = {
      id: string
      name: string

      provider: string
      state: Source.State
      connected: boolean
      initialized: boolean

      credentials?: Record<string, any>
      providerState?: Record<string, any>
      entrypoint?: Record<string, any>
      entrypointOptions?: Record<string, any>

      createdAt: string
      updatedAt: string
    }
  }
}

export import UnbodyPlugins = CoreTypes.Plugins

export import UnbodyProjectDoc = CoreTypes.Project.Document
export import UnbodyProjectState = CoreTypes.Project.State
export const UnbodyProjectStates = CoreTypes.Project.States

export import UnbodyProjectSettings = CoreTypes.ProjectSettings
export import UnbodyProjectSettingsDoc = CoreTypes.ProjectSettings.Document

export import UnbodySourceDoc = CoreTypes.Source.Document
export import UnbodySourceState = CoreTypes.Source.State
export const UnbodySourceStates = CoreTypes.Source.States

export import EnhancementPipelineDefinition = CoreTypes.ProjectSettings.Enhancement.Pipeline
export import EnhancementPipelineStepDefinition = CoreTypes.ProjectSettings.Enhancement.Step
