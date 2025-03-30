import { ApiProperty } from '@nestjs/swagger'
import { IsString } from 'class-validator'

export class CreateProjectDto {
  @ApiProperty({
    required: true,
    description: 'Project name',
  })
  @IsString()
  name: string
}
