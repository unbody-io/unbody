import { ApiProperty } from '@nestjs/swagger'
import { IsObject, IsOptional, IsUrl } from 'class-validator'

export class ConnectSourceDto {
  @ApiProperty({
    example: {
      sourceId: 'sourceId',
      extraKey: 'extraValue',
    },
    required: false,
  })
  @IsObject()
  @IsOptional()
  state?: Record<string, any>

  @ApiProperty({
    example: 'https://example.com',
    required: false,
  })
  @IsOptional()
  @IsUrl({
    protocols: ['http', 'https'],
    allow_fragments: true,
    require_tld: false,
  })
  redirectUrl?: string
}
