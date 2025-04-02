import { UnbodyProjectSettingsDoc } from './lib/core-types'

export const settings: UnbodyProjectSettingsDoc = {
  fileParsers: {
    'image/.*': [{ name: 'file-parser-image' }],
    'text/markdown': [{ name: 'file-parser-markdown' }],
  },
  textVectorizer: {
    name: 'text2vec-openai-ada-002',
  },
  enhancement: {
    pipelines: [],
  },
  customSchema: {
    collections: [],
  },
}
