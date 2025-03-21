import { ApiProperty } from '@nestjs/swagger'
import { IsBoolean, IsObject, IsOptional } from 'class-validator'

export class VerifySourceConnectionDto {
  @ApiProperty({
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  reconnect?: boolean

  @ApiProperty({
    example: { code: '123141' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  payload?: Record<string, any>
}
