export namespace OpenAI {
  export const Models = {
    gpt3_5Turbo: 'gpt-3.5-turbo',
    gpt4: 'gpt-4',
    gpt4Turbo: 'gpt-4-turbo',
    gpt4o: 'gpt-4o',
    gpt4oMini: 'gpt-4o-mini',
    gpt4oTurbo: 'gpt-4o-turbo',
    o1Mini: 'o1-mini',
    o1: 'o1',
    o3Mini: 'o3-mini',
  } as const
  export const allModels = [...Object.values(Models)] as const
  export type Model = (typeof allModels)[number]
}
