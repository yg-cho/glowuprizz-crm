import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsObject, IsOptional, IsString, Matches } from 'class-validator';

/** 브라우저(주입 스크립트)가 보낼 수 있는 이벤트. VIEW·SUBMIT_SUCCESS 는 서버만 기록한다. */
export const CLIENT_EVENT_TYPES = ['form_view', 'form_start', 'submit_attempt', 'submit_error'] as const;
export type ClientEventType = (typeof CLIENT_EVENT_TYPES)[number];

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
