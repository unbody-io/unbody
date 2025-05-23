import { ApiProperty } from '@nestjs/swagger'
import { IsObject, IsOptional, IsString } from 'class-validator'

export class ExecGraphQLQueryDto {
  @ApiProperty({})
  @IsString()
  @IsOptional()
  operationName?: string

  @ApiProperty({
    required: true,
  })
  @IsString()
  query!: string

  @ApiProperty({
    example: {},
    required: false,
  })
  @IsOptional()
  @IsObject()
  variables?: Record<string, any>
}
