import { ApiProperty } from '@nestjs/swagger';
import { LINK_CODE_PATTERN } from '@glowuprizz/shared';
import { IsObject, IsOptional, IsString, Matches } from 'class-validator';

export class SubmitDto {
  @ApiProperty({ required: false, description: '배포 링크 코드 (채널 귀속). 없으면 직접 유입', example: 'k3m9pq2x' })
  @IsOptional()
  @IsString()
  @Matches(LINK_CODE_PATTERN)
  linkCode?: string | null;

  @ApiProperty({ description: '폼 필드 name → value(또는 value[])', example: { name: '홍길동', phone: '010-1234-5678' } })
  @IsObject()
  fields!: Record<string, string | string[]>;
}
