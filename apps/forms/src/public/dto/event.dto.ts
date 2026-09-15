import { ApiProperty } from '@nestjs/swagger';
import { CLIENT_EVENT_TYPES, ClientEventType, LINK_CODE_PATTERN } from '@glowuprizz/shared';
import { IsIn, IsObject, IsOptional, IsString, Matches } from 'class-validator';


export class EventDto {
  @ApiProperty({ required: false, example: 'k3m9pq2x' })
  @IsOptional()
  @IsString()
  @Matches(LINK_CODE_PATTERN)
  linkCode?: string | null;

  @ApiProperty({ enum: CLIENT_EVENT_TYPES })
  @IsIn(CLIENT_EVENT_TYPES)
  type!: ClientEventType;

  @ApiProperty({ required: false, description: '부가 정보 (≤1KB). 예: { field: "phone" }, { reason: "http", status: 400 }' })
  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown>;
}
