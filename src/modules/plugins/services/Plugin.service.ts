import { Injectable } from '@nestjs/common'
import { ConfigService } from 'src/lib/nestjs-utils'

@Injectable()
export class PluginService {
  constructor(configService: ConfigService) {}

  
}
