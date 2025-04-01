import { ApiProperty } from '@nestjs/swagger'
import {
  IsArray,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator'

export class VectorizeMultimodalDto {
  @ApiProperty({})
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  texts: string[] = []

  @ApiProperty({})
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images: string[] = []

  @ApiProperty({})
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  audio: string[] = []

  @ApiProperty({})
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  video: string[] = []

  @ApiProperty({})
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  imu: string[] = []

  @ApiProperty({})
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  thermal: string[] = []

  @ApiProperty({})
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  depth: string[] = []

  @ApiProperty({})
  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  weights: number[] = []

  @ApiProperty({})
  @IsObject()
  @IsOptional()
  options: Record<string, any> = {}
}
