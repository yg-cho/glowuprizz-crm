import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { CHANNELS, Channel } from '@glowuprizz/shared';
import { PaginationDto } from '../../common/pagination.dto';

export class SubmissionListDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() formId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() campaignId?: string;
  @ApiPropertyOptional({ enum: CHANNELS }) @IsOptional() @IsIn(CHANNELS) channel?: Channel;
}
