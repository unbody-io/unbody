import { ApiProperty } from '@nestjs/swagger'
import { IsObject } from 'class-validator'

export class SetEntrypointDto {
  @ApiProperty({
    required: true,
  })
  @IsObject()
  entrypoint?: Record<string, any>
}
