import { WeaviateClient, weaviateV2 } from 'weaviate-client'

export type WeaviateV2 = ReturnType<typeof weaviateV2.client>
export type WeaviateV3 = WeaviateClient
