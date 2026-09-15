import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export const MAX_PAGE_SIZE = 100;

/** page/pageSize 쿼리. 잘못된 값은 400 (조용한 폴백 없음). */
export class PaginationDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, maximum: MAX_PAGE_SIZE })
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) @Max(MAX_PAGE_SIZE)
  pageSize?: number;
}
