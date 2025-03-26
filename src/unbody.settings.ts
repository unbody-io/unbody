import { UnbodyProjectSettingsDoc } from './lib/core-types'
import { Config as WeaviateConfig } from './plugins/plugin-database-weaviate/plugin.types'
import { Config as StructuredOutputGeneratorConfig } from './plugins/plugin-enhancer-structured-output-generator/plugin.types'
import { Config as SummarizerEnhancerConfig } from './plugins/plugin-enhancer-summarizer/plugin.types'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
const GOOGLE_DRIVE_CLIENT_SECRET_PATH =
  process.env.GOOGLE_DRIVE_CLIENT_SECRET_PATH || ''
const GITHUB_CLIENT_SECRET_PATH = process.env.GITHUB_CLIENT_SECRET_PATH || ''

export const settings: UnbodyProjectSettingsDoc = {
  plugins: [
    {
      path: require.resolve('./plugins/plugin-database-weaviate'),
      alias: 'weaviate',
      config: async () =>
        ({
          connection: {
            httpHost: '127.0.0.1',
            httpPort: 8080,
            grpcHost: '127.0.0.1',
          },
        }) as WeaviateConfig,
    },
    {
      path: require.resolve('./plugins/plugin-text2vec-openai'),
      config: async () => ({
        clientSecret: {
          apiKey: OPENAI_API_KEY,
        },
        options: {
          model: 'text-embedding-3-small',
          autoTrim: true,
        },
      }),
      alias: 'text2vec-openai-text-embedding-3-small',
    },
    GOOGLE_DRIVE_CLIENT_SECRET_PATH
      ? {
          path: require.resolve('./plugins/plugin-provider-google-drive'),
          config: async () => ({
            clientSecret: require(GOOGLE_DRIVE_CLIENT_SECRET_PATH),
          }),
          alias: 'google_drive',
        }
      : null,
    GITHUB_CLIENT_SECRET_PATH
      ? {
          path: require.resolve('./plugins/plugin-provider-github-issues'),
          alias: 'github_issues',
          config: async () => ({
            clientSecret: require(GITHUB_CLIENT_SECRET_PATH),
          }),
        }
      : null,
    {
      path: require.resolve('./plugins/plugin-file-parser-google-doc'),
      alias: 'google-doc-parser',
      config: async () => ({}),
    },
    {
      path: require.resolve('./plugins/plugin-file-parser-image'),
      alias: 'file-parser-image',
      config: async () => ({}),
    },
    {
      path: require.resolve('./plugins/plugin-storage-local'),
      alias: 'local-storage',
      config: async () => ({
        publicRootDir: process.env.LOCAL_STORAGE_PUBLIC_ROOT_DIR,
        privateRootDir: process.env.LOCAL_STORAGE_PRIVATE_ROOT_DIR,
        publicBaseUrl: process.env.LOCAL_STORAGE_PUBLIC_BASE_URL,
        privateBaseUrl: process.env.LOCAL_STORAGE_PRIVATE_BASE_URL,
      }),
    },
    {
      path: require.resolve('./plugins/plugin-enhancer-summarizer'),
      alias: 'enhancer-summarizer',
      config: async () =>
        ({
          clientSecret: {
            openai: {
              apiKey: OPENAI_API_KEY,
            },
          },
        }) as SummarizerEnhancerConfig,
    },
    {
      path: require.resolve(
        './plugins/plugin-enhancer-structured-output-generator',
      ),
      alias: 'enhancer-structured-output-generator',
      config: async () =>
        ({
          clientSecret: {
            openai: {
              apiKey: OPENAI_API_KEY,
            },
          },
        }) as StructuredOutputGeneratorConfig,
    },
  ].filter((it) => it !== null),
  modules: {
    fileParsers: {
      'application/vnd.google-apps.document': [{ name: 'google-doc-parser' }],
      'image/.*': [{ name: 'file-parser-image', options: {} }],
    },
    textVectorizer: {
      name: 'text2vec-openai-text-embedding-3-small',
    },
    enhancement: {
      pipelines: [],
    },
  },
  customSchema: {
    collections: [],
  },
}
