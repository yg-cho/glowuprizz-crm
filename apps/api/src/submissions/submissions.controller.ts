import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentOperator, OperatorPrincipal } from '../common/current-operator.decorator';
import { OperatorApi } from '../common/operator-api.decorator';
import { SubmissionsService } from './submissions.service';
import { SubmissionListDto } from './dto/submission-list.dto';

@ApiTags('submissions')
@OperatorApi()
@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly submissions: SubmissionsService) {}

  @Get()
  @ApiOperation({ summary: 'CRM 명단 조회 (신청 데이터). formId · campaignId · channel 로 필터, 페이지네이션' })
  list(@CurrentOperator() op: OperatorPrincipal, @Query() q: SubmissionListDto) {
    return this.submissions.list(op.id, q);
  }

  @Get(':id/journey')
  @ApiOperation({ summary: '신청 1건의 방문자 여정: 채널 → 클릭 → 폼 도달 → 작성 → 제출 이벤트 타임라인' })
  journey(@CurrentOperator() op: OperatorPrincipal, @Param('id', ParseUUIDPipe) id: string) {
    return this.submissions.journey(op.id, id);
  }
}
