import { ApiProperty } from '@nestjs/swagger'
import { IsString, Length, Matches } from 'class-validator'
import { TrimString } from 'src/modules/shared/transformers/TrimString.transformer'

export class CreateSourceDto {
  @ApiProperty({
    example: 'google_drive',
  })
  @IsString()
  provider!: string

  @ApiProperty({
    example: 'Google Drive source',
  })
  @IsString()
  @Length(1)
  @TrimString()
  @Matches(/^(\w|-|\s)*$/, {
    message:
      'The name should only include letters, numbers, underscores, spaces, and hyphens.',
  })
  name!: string
}
