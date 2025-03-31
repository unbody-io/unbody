export type JsonPrimitive = string | number | boolean | null
export type JsonSerializable =
  | JsonPrimitive
  | {
      [key: string]: JsonPrimitive | JsonSerializable | JsonSerializable[]
    }
  | JsonSerializable[]
