import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsUUID } from 'class-validator';
import { CHANNELS, Channel } from '@glowuprizz/shared';

export class CreateLinkDto {
  @ApiProperty()
  @IsUUID()
  formId!: string;

  @ApiProperty({ enum: CHANNELS })
  @IsIn(CHANNELS)
  channel!: Channel;
}
