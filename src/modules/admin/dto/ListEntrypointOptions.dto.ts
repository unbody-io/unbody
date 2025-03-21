import { ApiProperty } from '@nestjs/swagger'
import { IsObject, IsOptional } from 'class-validator'

export class ListEntrypointOptionsDto {
  @ApiProperty({
    required: false,
  })
  @IsOptional()
  @IsObject()
  parent?: Record<string, any>
}
