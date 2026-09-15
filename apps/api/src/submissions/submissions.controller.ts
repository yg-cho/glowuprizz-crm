import { Controller, DefaultValuePipe, Get, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentOperator, OperatorPrincipal } from '../common/current-operator.decorator';
import { SubmissionsService } from './submissions.service';

@ApiTags('submissions')
@ApiCookieAuth('gu_admin')
@UseGuards(JwtAuthGuard)
@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly submissions: SubmissionsService) {}

  @Get()
  @ApiOperation({ summary: 'CRM 명단 조회 (신청 데이터). formId 또는 campaignId 로 필터' })
  @ApiQuery({ name: 'formId', required: false })
  @ApiQuery({ name: 'campaignId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  list(
    @CurrentOperator() op: OperatorPrincipal,
    @Query('formId') formId?: string,
    @Query('campaignId') campaignId?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize = 20,
  ) {
    return this.submissions.list(op.id, { formId, campaignId, page: Math.max(1, page), pageSize: Math.min(100, Math.max(1, pageSize)) });
  }
}
