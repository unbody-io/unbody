import { UnbodyProjectSettingsDoc } from './lib/core-types'

export const settings: UnbodyProjectSettingsDoc = {
  fileParsers: {
    'application/vnd.google-apps.document': [
      { name: 'file-parser-google-doc' },
    ],
    'image/.*': [{ name: 'file-parser-google-image' }],
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
