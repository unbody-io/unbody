import { ApiProperty } from '@nestjs/swagger'
import {
  IsArray,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator'

export class VectorizeTextDto {
  @ApiProperty({})
  @IsArray()
  @IsString({ each: true })
  inputs: string[]

  @ApiProperty({})
  @IsObject()
  @IsOptional()
  options: Record<string, any> = {}

  @ApiProperty({})
  @IsEnum(['object', 'query'])
  @IsOptional()
  type: 'object' | 'query' = 'query'
}
