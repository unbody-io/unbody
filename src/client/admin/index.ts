import { BaseClient } from '../base'
import {
  CreateSourceDto,
  ConnectSourceDto,
  VerifySourceConnectionDto,
  ListEntrypointOptionsDto,
  SetEntrypointDto,
  Project,
  Source,
} from './types'

namespace Project {
  export interface Client {
    create: () => Promise<Project>
    delete: (options?: {
      keepSources?: boolean
      exit?: boolean
    }) => Promise<void>
    source: Source.Client
  }

  namespace Source {
    export interface Client {
      create: (data: CreateSourceDto) => Promise<Source>
      delete: (sourceId: string) => Promise<void>
      connect: (sourceId: string, data: ConnectSourceDto) => Promise<void>
      indexing: Indexing.Client
      verifyConnection: (
        sourceId: string,
        data: VerifySourceConnectionDto,
      ) => Promise<void>
      listEntrypointOptions: (
        sourceId: string,
        data: ListEntrypointOptionsDto,
      ) => Promise<void>
      setEntrypoint: (sourceId: string, data: SetEntrypointDto) => Promise<void>
      list: () => Promise<Source[]>
    }

    namespace Indexing {
      export interface Client {
        init: (sourceId: string) => Promise<void>
        rebuild: (sourceId: string) => Promise<void>
        update: (sourceId: string) => Promise<void>
      }

      export function client(client: BaseClient): Client {
        return {
          init: async (sourceId: string) => {
            return client.request(
              'POST',
              `/admin/projects/any/sources/${sourceId}/indexing/init`,
            )
          },

          rebuild: async (sourceId: string) => {
            return client.request(
              'POST',
              `/admin/projects/any/sources/${sourceId}/indexing/rebuild`,
            )
          },

          update: async (sourceId: string) => {
            return client.request(
              'POST',
              `/admin/projects/any/sources/${sourceId}/indexing/update`,
            )
          },
        }
      }
    }

    export function client(client: BaseClient): Client {
      return {
        create: async (data: CreateSourceDto) => {
          return client.request<Source>(
            'POST',
            `/admin/projects/any/sources`,
            data,
          )
        },

        delete: async (sourceId: string) => {
          return client.request(
            'DELETE',
            `/admin/projects/any/sources/${sourceId}`,
          )
        },

        connect: async (sourceId: string, data: ConnectSourceDto) => {
          return client.request(
            'POST',
            `/admin/projects/any/sources/${sourceId}/connect`,
            data,
          )
        },

        indexing: Indexing.client(client),

        verifyConnection: async (
          sourceId: string,
          data: VerifySourceConnectionDto,
        ) => {
          return client.request(
            'PATCH',
            `/admin/projects/any/sources/${sourceId}/verify-connection`,
            data,
          )
        },

        listEntrypointOptions: async (
          sourceId: string,
          data: ListEntrypointOptionsDto,
        ) => {
          return client.request(
            'POST',
            `/admin/projects/any/sources/${sourceId}/list-entrypoint-options`,
            data,
          )
        },

        setEntrypoint: async (sourceId: string, data: SetEntrypointDto) => {
          return client.request(
            'PATCH',
            `/admin/projects/any/sources/${sourceId}/set-entrypoint`,
            data,
          )
        },

        list: async () => {
          // For some reason, the response is an object with numeric keys
          const response = await client.request<Record<string, Source>>(
            'GET',
            `/admin/projects/any/sources`,
          )
          return Object.values(response)
        },
      }
    }
  }

  export function client(client: BaseClient): Client {
    return {
      create: async () => {
        return client.request<Project>('POST', '/admin/projects')
      },

      delete: async (options?: { keepSources?: boolean; exit?: boolean }) => {
        return client.request(
          'DELETE',
          `/admin/projects/any`,
          undefined,
          options,
        )
      },
      source: Source.client(client),
    }
  }
}

export interface Client {
  project: Project.Client
}

export function create(client: BaseClient): Client {
  return {
    project: Project.client(client),
  }
}
