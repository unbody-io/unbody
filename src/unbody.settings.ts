import {
  AutoSummary,
  AutoVision,
  Generative,
  ImageVectorizer,
  ProjectSettings,
} from './lib/project-settings/'

const settings = new ProjectSettings()
  .withImageVectorizer(ImageVectorizer.Img2Vec.neural)
  .withGenerative(Generative.OpenAI.gpt4o)
  .withAutoSummary(AutoSummary.OpenAI.gpt4o)
  .withAutoVision(AutoVision.OpenAI.gpt4o)
  .toJSON()

console.log(settings)
export { settings }
