import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsObject, IsOptional, IsString, Matches } from 'class-validator';

import { CLIENT_EVENT_TYPES, ClientEventType } from '@glowuprizz/shared';

export class EventDto {
  @ApiProperty({ required: false, example: 'k3m9pq2x' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]{4,32}$/)
  linkCode?: string | null;

  @ApiProperty({ enum: CLIENT_EVENT_TYPES })
  @IsIn(CLIENT_EVENT_TYPES)
  type!: ClientEventType;

  @ApiProperty({ required: false, description: '부가 정보 (≤1KB). 예: { field: "phone" }, { reason: "http", status: 400 }' })
  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown>;
}
