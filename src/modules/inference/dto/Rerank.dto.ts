import { ApiProperty } from '@nestjs/swagger'
import { IsArray, IsOptional, IsString } from 'class-validator'

export class RerankDto {
  @ApiProperty({})
  @IsString()
  query: string

  @ApiProperty({})
  @IsArray()
  @IsString({ each: true })
  documents: string[]

  @ApiProperty({})
  @IsString()
  @IsOptional()
  property: string
}
