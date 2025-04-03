import type { Config as WeaviateConfig } from 'src/plugins/plugin-database-weaviate/plugin.types'
import type { Config as SummarizerConfig } from 'src/plugins/plugin-enhancer-summarizer/plugin.types'
import type {
  Config as Multi2VecCohereConfig,
  Model as Multi2VecCohereModel,
} from 'src/plugins/plugin-multi2vec-cohere/plugin.types'
import type { Config as LocalStorageConfig } from 'src/plugins/plugin-storage-local/plugin.types'
import type {
  Config as Text2VecOpenAIConfig,
  Model as Text2VecOpenAIModel,
} from 'src/plugins/plugin-text2vec-openai/plugin.types'
import { UnbodyPlugins } from '../../../lib/core-types'
import * as BuiltinPlugin from 'src/lib/plugins/builtin'

interface Registration extends UnbodyPlugins.Registration {
  alias: BuiltinPlugin.Alias
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
  alias: BuiltinPlugin.Alias
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
    errorResolutionSuggestion: `Please check if the following environment variables are set correctly:
  - OPENAI_API_KEY
  `,
  }
}

const COHERE_API_KEY = process.env.COHERE_API_KEY || ''

const multi2vecCoherePlugin = ({
  alias,
  model,
}: {
  alias: BuiltinPlugin.Alias
  model: Multi2VecCohereModel
}) => {
  return {
    path: pluginPath('plugin-multi2vec-cohere'),
    config: async () =>
      ({
        clientSecret: {
          apiKey: COHERE_API_KEY,
        },
        options: {
          model,
        },
      }) satisfies Multi2VecCohereConfig,
    alias,
    errorResolutionSuggestion: `Please check if the following environment variables are set correctly:
  - COHERE_API_KEY
  `,
  }
}

export const plugins: Record<BuiltinPlugin.Alias, Registration> = [
  {
    path: pluginPath('plugin-provider-local-folder'),
    alias: BuiltinPlugin.DataSourceProvider.localFolder,
    config: async () => ({}),
  },
  {
    path: pluginPath('plugin-database-weaviate'),
    alias: BuiltinPlugin.Database.weaviate,
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
  {
    alias: BuiltinPlugin.ImageVectorizer.Img2Vec.neural,
    path: pluginPath('plugin-img2vec-neural'),
    config: async () => ({
      baseURL: process.env.IMG2VEC_BASE_URL,
    }),
  },
  {
    alias: BuiltinPlugin.Reranker.Cohere.englishV3,
    path: pluginPath('plugin-reranker-cohere'),
    config: async () => ({
      clientSecret: {
        apiKey: 'something',
      },
    }),
  },
  {
    alias: BuiltinPlugin.Generative.openAI,
    path: pluginPath('plugin-generative-openai'),
    config: async () => ({
      clientSecret: {
        apiKey: OPENAI_API_KEY,
        project: OPENAI_PROJECT,
        organization: OPENAI_ORGANIZATION,
      },
    }),
    errorResolutionSuggestion: `Please check if the following environment variables are set correctly:
  - OPENAI_API_KEY
  `,
  },
  text2VecOpenAIPlugin({
    alias: BuiltinPlugin.TextVectorizer.OpenAI.embeddingAda002,
    model: 'text-embedding-ada-002',
  }),
  text2VecOpenAIPlugin({
    alias: BuiltinPlugin.TextVectorizer.OpenAI.embedding3Large,
    model: 'text-embedding-3-large',
  }),
  text2VecOpenAIPlugin({
    alias: BuiltinPlugin.TextVectorizer.OpenAI.embedding3Small,
    model: 'text-embedding-3-small',
  }),
  multi2vecCoherePlugin({
    alias: BuiltinPlugin.MultimodalVectorizer.Cohere.englishV3,
    model: 'embed-english-v3.0',
  }),
  multi2vecCoherePlugin({
    alias: BuiltinPlugin.MultimodalVectorizer.Cohere.englishLightV3,
    model: 'embed-english-light-v3.0',
  }),
  multi2vecCoherePlugin({
    alias: BuiltinPlugin.MultimodalVectorizer.Cohere.multilingualV3,
    model: 'embed-multilingual-v3.0',
  }),
  multi2vecCoherePlugin({
    alias: BuiltinPlugin.MultimodalVectorizer.Cohere.multilingualLightV3,
    model: 'embed-multilingual-light-v3.0',
  }),
  {
    path: pluginPath('plugin-provider-local-folder'),
    alias: BuiltinPlugin.DataSourceProvider.localFolder,
    config: {},
  },
  {
    path: pluginPath('plugin-file-parser-google-doc'),
    alias: BuiltinPlugin.FileParser.googleDoc,
    config: async () => ({}),
  },
  {
    path: pluginPath('plugin-file-parser-image'),
    alias: BuiltinPlugin.FileParser.image,
    config: async () => ({}),
  },
  {
    path: pluginPath('plugin-file-parser-markdown'),
    alias: BuiltinPlugin.FileParser.markdown,
    config: {},
  },
  {
    path: pluginPath('plugin-storage-local'),
    alias: BuiltinPlugin.Storage.local,
    config: async () =>
      ({
        publicRootDir: process.env.LOCAL_STORAGE_PUBLIC_ROOT_DIR,
        privateRootDir: process.env.LOCAL_STORAGE_PRIVATE_ROOT_DIR,
        publicBaseUrl: process.env.LOCAL_STORAGE_PUBLIC_BASE_URL,
        privateBaseUrl: process.env.LOCAL_STORAGE_PRIVATE_BASE_URL,
      }) as LocalStorageConfig,
    errorResolutionSuggestion: `Please check if the following environment variables are set correctly, and that the corresponding directories exist:
  - LOCAL_STORAGE_PUBLIC_ROOT_DIR
  - LOCAL_STORAGE_PRIVATE_ROOT_DIR
  - LOCAL_STORAGE_PUBLIC_BASE_URL
  - LOCAL_STORAGE_PRIVATE_BASE_URL
  `,
  },
  {
    path: pluginPath('plugin-enhancer-summarizer'),
    alias: BuiltinPlugin.Enhancer.summarizer,
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
    errorResolutionSuggestion: `Please check if the following environment variables are set correctly:
  - OPENAI_API_KEY
  `,
  },
  {
    path: pluginPath('plugin-enhancer-structured-output-generator'),
    alias: BuiltinPlugin.Enhancer.structuredOutputGenerator,
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
    errorResolutionSuggestion: `Please check if the following environment variables are set correctly:
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
  {} as Record<BuiltinPlugin.Alias, Registration>,
)

export function isBuiltInPlugin(alias: string): alias is BuiltinPlugin.Alias {
  return BuiltinPlugin.aliases.includes(alias as BuiltinPlugin.Alias)
}
