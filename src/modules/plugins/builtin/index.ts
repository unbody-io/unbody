import type { Config as WeaviateConfig } from 'src/plugins/plugin-database-weaviate/plugin.types'
import type { Config as SummarizerConfig } from 'src/plugins/plugin-enhancer-summarizer/plugin.types'
import type {
  Config as Text2VecOpenAIConfig,
  Model as Text2VecOpenAIModel,
} from 'src/plugins/plugin-text2vec-openai/plugin.types'
import { UnbodyPlugins } from '../../../lib/core-types'
import type { Config as LocalStorageConfig } from 'src/plugins/plugin-storage-local/plugin.types'

export namespace Database {
  export const weaviate = 'database-weaviate' as const
}

export namespace TextVectorizer {
  export namespace OpenAI {
    export const embeddingAda002 = 'text2vec-openai-ada-002' as const
    export const embedding3Large = 'text2vec-openai-3-large' as const
    export const embedding3Small = 'text2vec-openai-3-small' as const
  }
}

export namespace FileParser {
  export const image = 'file-parser-image' as const
  export const googleDoc = 'file-parser-google-doc' as const
}

export namespace Storage {
  export const local = 'local-storage' as const
}

export namespace Enhancer {
  export const summarizer = 'enhancer-summarizer' as const
}

export namespace Defaults {
  export const database = Database.weaviate
  export const textVectorizer = TextVectorizer.OpenAI.embeddingAda002
  export const storage = Storage.local
}

const aliases = [
  Database.weaviate,
  TextVectorizer.OpenAI.embeddingAda002,
  TextVectorizer.OpenAI.embedding3Large,
  TextVectorizer.OpenAI.embedding3Small,
  FileParser.image,
  FileParser.googleDoc,
  Storage.local,
  Enhancer.summarizer,
] as const

type Alias = (typeof aliases)[number]

interface Registration extends UnbodyPlugins.Registration {
  alias: Alias
  errorResolutionSuggestion?: string
}

const pluginPath = (plugin: string) => {
  return require.resolve(`../../../plugins/${plugin}`)
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
const OPENAI_PROJECT = process.env.OPENAI_PROJECT || ''
const OPENAI_ORGANIZATION = process.env.OPENAI_ORGANIZATION || ''

const text2VecOpenAIPlugin = ({
  alias,
  model,
}: {
  alias: Alias
  model: Text2VecOpenAIModel
}) => {
  return {
    path: pluginPath('plugin-text2vec-openai'),
    config: async () =>
      ({
        clientSecret: {
          apiKey: OPENAI_API_KEY,
          project: OPENAI_PROJECT,
          organization: OPENAI_ORGANIZATION,
        },
        options: {
          model: model,
          autoTrim: true,
        },
      }) satisfies Text2VecOpenAIConfig,
    alias,
    errorResolutionSuggestion: `Please check if the the following environment variables are set correctly:
  - OPENAI_API_KEY
  `,
  }
}

export const plugins: Record<Alias, Registration> = [
  {
    path: pluginPath('plugin-database-weaviate'),
    alias: Database.weaviate,
    config: async () => {
      const defaultHost = '127.0.0.1'
      const defaultPort = 8080
      return {
        connection: {
          httpHost:
            process.env.PLUGIN_DATABASE_WEAVIATE_HTTP_HOST || defaultHost,
          httpPort:
            process.env.PLUGIN_DATABASE_WEAVIATE_HTTP_PORT || defaultPort,
          grpcHost:
            process.env.PLUGIN_DATABASE_WEAVIATE_GRPC_HOST || defaultHost,
        },
      } as WeaviateConfig
    },
    errorResolutionSuggestion: `Please make sure weaviate is running and that the following environment variables are set correctly:
  - PLUGIN_DATABASE_WEAVIATE_HTTP_HOST
  - PLUGIN_DATABASE_WEAVIATE_HTTP_PORT
  - PLUGIN_DATABASE_WEAVIATE_GRPC_HOST
  `,
  },
  text2VecOpenAIPlugin({
    alias: TextVectorizer.OpenAI.embeddingAda002,
    model: 'text-embedding-ada-002',
  }),
  text2VecOpenAIPlugin({
    alias: TextVectorizer.OpenAI.embedding3Large,
    model: 'text-embedding-3-large',
  }),
  text2VecOpenAIPlugin({
    alias: TextVectorizer.OpenAI.embedding3Small,
    model: 'text-embedding-3-small',
  }),
  {
    path: pluginPath('plugin-file-parser-image'),
    alias: FileParser.image,
    config: async () => ({}),
  },
  {
    path: pluginPath('plugin-storage-local'),
    alias: Storage.local,
    config: async () =>
      ({
        publicRootDir: process.env.LOCAL_STORAGE_PUBLIC_ROOT_DIR,
        privateRootDir: process.env.LOCAL_STORAGE_PRIVATE_ROOT_DIR,
        publicBaseUrl: process.env.LOCAL_STORAGE_PUBLIC_BASE_URL,
        privateBaseUrl: process.env.LOCAL_STORAGE_PRIVATE_BASE_URL,
      }) as LocalStorageConfig,
    errorResolutionSuggestion: `Please check if the the following environment variables are set correctly, and that the corresponding directories exist:
  - LOCAL_STORAGE_PUBLIC_ROOT_DIR
  - LOCAL_STORAGE_PRIVATE_ROOT_DIR
  - LOCAL_STORAGE_PUBLIC_BASE_URL
  - LOCAL_STORAGE_PRIVATE_BASE_URL
  `,
  },
  {
    path: pluginPath('plugin-enhancer-summarizer'),
    alias: Enhancer.summarizer,
    config: async () =>
      ({
        clientSecret: {
          openai: {
            apiKey: OPENAI_API_KEY,
            project: OPENAI_PROJECT,
            organization: OPENAI_ORGANIZATION,
          },
        },
      }) as SummarizerConfig,
    errorResolutionSuggestion: `Please check if the the following environment variables are set correctly:
  - OPENAI_API_KEY
  `,
  },
].reduce(
  (acc, plugin) => {
    return {
      ...acc,
      [plugin.alias]: plugin,
    }
  },
  {} as Record<Alias, Registration>,
)

export function isBuiltInPlugin(alias: string): alias is Alias {
  return aliases.includes(alias as Alias)
}
