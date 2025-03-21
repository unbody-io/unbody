import { ApiProperty } from '@nestjs/swagger'
import { IsArray, IsObject, IsOptional, IsString } from 'class-validator'

export class VectorizeTextDto {
  @ApiProperty({})
  @IsArray()
  @IsString({ each: true })
  inputs: string[]

  @ApiProperty({})
  @IsObject()
  @IsOptional()
  options: Record<string, any> = {}
}
