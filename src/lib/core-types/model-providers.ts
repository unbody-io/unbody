export namespace MiniMax {
  export const Models = {
    m2_7: 'MiniMax-M2.7',
    m2_7Highspeed: 'MiniMax-M2.7-highspeed',
    m2_5: 'MiniMax-M2.5',
    m2_5Highspeed: 'MiniMax-M2.5-highspeed',
  } as const
  export const allModels = [...Object.values(Models)] as const
  export type Model = (typeof allModels)[number]
}

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
