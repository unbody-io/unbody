export interface CreateSourceDto {
  provider: string
  name: string
}

export interface ConnectSourceDto {
  state: Record<string, any>
  redirectUrl: string
}

export interface VerifySourceConnectionDto {
  reconnect?: boolean
  payload: Record<string, any>
}

export interface ListEntrypointOptionsDto {
  parent?: Record<string, any>
}

export interface SetEntrypointDto {
  entrypoint: Record<string, any>
}

// Response types
export interface Project {
  id: string
}

export interface Source {
  id: string
  projectId: string
  provider: string
  name: string
}

export interface ExecGraphQLQueryDto {
  operationName: string
  query: string
  variables?: Record<string, any>
}

export interface VectorizeTextDto {
  inputs: string[]
  options?: Record<string, any>
}

export interface RerankDto {
  query: string
  documents: string[]
  property: string
}
