import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsISO8601, IsOptional, IsUUID } from 'class-validator';
import { CHANNELS, Channel } from '@glowuprizz/shared';

export const RANGES = ['today', '7d', '30d', '90d', 'all', 'custom'] as const;
export type Range = (typeof RANGES)[number];

/** 모든 성과 API 가 공유하는 필터. 기간은 range 또는 from/to(custom). */
export class StatsQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() campaignId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() formId?: string;
  @ApiPropertyOptional({ enum: CHANNELS }) @IsOptional() @IsIn(CHANNELS) channel?: Channel;

  @ApiPropertyOptional({ enum: RANGES, default: '7d' }) @IsOptional() @IsIn(RANGES) range?: Range;
  @ApiPropertyOptional({ description: 'range=custom 일 때 시작(ISO, 포함)' }) @IsOptional() @IsISO8601() from?: string;
  @ApiPropertyOptional({ description: 'range=custom 일 때 끝(ISO, 미포함)' }) @IsOptional() @IsISO8601() to?: string;

  @ApiPropertyOptional({ description: '같은 길이의 직전 기간과 비교', default: false })
  @IsOptional() @Transform(({ value }) => value === true || value === 'true' || value === '1') @IsBoolean()
  compare?: boolean;
}

export class VisitorsQueryDto extends StatsQueryDto {
  @ApiPropertyOptional({ enum: ['FORM_VIEW', 'FORM_START', 'SUBMIT_ATTEMPT'], description: '이 단계까지는 도달한 방문자', default: 'FORM_START' })
  @IsOptional() @IsIn(['FORM_VIEW', 'FORM_START', 'SUBMIT_ATTEMPT']) stage?: 'FORM_VIEW' | 'FORM_START' | 'SUBMIT_ATTEMPT';

  @ApiPropertyOptional({ description: 'true=신청 완료한 방문자, false=미신청(리마케팅 후보)', default: false })
  @IsOptional() @Transform(({ value }) => value === true || value === 'true' || value === '1') @IsBoolean()
  submitted?: boolean;

  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Transform(({ value }) => Number(value)) page?: number;
  @ApiPropertyOptional({ default: 20 }) @IsOptional() @Transform(({ value }) => Number(value)) pageSize?: number;
}
