import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateFormDto {
  @ApiProperty()
  @IsUUID()
  campaignId!: string;

  @ApiProperty()
  @IsUUID()
  templateId!: string;

  @ApiProperty({ example: '무료 PT 신청 폼 A' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ required: false, description: '공개 URL 경로. 미입력 시 자동 생성', example: 'free-pt-sep' })
  @IsOptional()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'slug must be lowercase letters, digits and hyphens' })
  @MinLength(3)
  @MaxLength(60)
  slug?: string;
}
