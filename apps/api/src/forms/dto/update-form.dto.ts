import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateFormDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @ApiProperty({ required: false, enum: ['ACTIVE', 'PAUSED'] })
  @IsOptional()
  @IsEnum(['ACTIVE', 'PAUSED'])
  status?: 'ACTIVE' | 'PAUSED';
}
