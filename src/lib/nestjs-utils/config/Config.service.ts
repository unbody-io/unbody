import { Injectable } from '@nestjs/common'
import { settleSync } from 'src/lib/core-utils'

// @ts-ignore
import * as Config from 'config'

type ConfigInstance<T extends object = {}> = T & Config.IConfig

@Injectable()
export class ConfigService<T extends object = {}> {
  config: ConfigInstance<T>
  env: string
  isDev: boolean
  serviceName: string
  isProduction: boolean

  constructor(config?: Config.IConfig) {
    this.config = (config ?? Config) as any as ConfigInstance<T>
    this.serviceName = this.get('app.name') ?? 'unnamed'
    this.env = this.get('app.env') ?? (process.env.NODE_ENV as string)
    this.isDev = ['dev', 'development'].includes(this.env)
    this.isProduction = ['prod', 'production'].includes(this.env)

    this.config.util.toObject(this.config)
  }

  get<T = any>(key: string): T | undefined {
    const [val, err] = settleSync<T>(() => this.config.get(key))

    if (err) return undefined

    return val
  }

  has(key: string): boolean {
    return this.config.has(key)
  }
}
