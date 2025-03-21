import { DatabasePluginContext } from 'src/lib/plugins-common/database'
import type { ConnectToCustomOptions } from 'weaviate-client'

export type Config = {
  connection: Omit<ConnectToCustomOptions, 'authCredentials'> & {
    auth?:
      | {
          username: string
          password: string
        }
      | {
          apiKey: string
        }
  }

  modules?: {
    textVectorizer?: {
      name: string
      config?: {
        endpointURL?: string
      }
    }
    imageVectorizer?: {
      name: string
      config?: {
        endpointURL: string
      }
    }
    generative?: {
      name: string
      config?: {
        endpointURL: string
      }
    }
    reranker?: {
      name: string
      config?: {
        endpointURL: string
      }
    }
  }
}

export type Context = DatabasePluginContext
