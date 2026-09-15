import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTemplateDto {
  @ApiProperty({ required: false, description: '미입력 시 파일명 사용' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;
}
