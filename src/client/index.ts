import * as Admin from './admin'
import * as BaseClient from './base'

interface Client {
  admin: Admin.Client
}

export const create = (config: BaseClient.Config): Client => {
  const baseClient = new BaseClient.BaseClient(config)
  return {
    admin: Admin.create(baseClient),
  }
}
