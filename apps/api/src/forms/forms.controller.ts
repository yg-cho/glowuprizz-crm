import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentOperator, OperatorPrincipal } from '../common/current-operator.decorator';
import { OperatorApi } from '../common/operator-api.decorator';
import { FormsService } from './forms.service';
import { CreateFormDto } from './dto/create-form.dto';
import { UpdateFormDto } from './dto/update-form.dto';

@ApiTags('forms')
@OperatorApi()
@Controller('forms')
export class FormsController {
  constructor(private readonly forms: FormsService) {}

  @Post()
  @ApiOperation({ summary: '캠페인 + HTML 템플릿으로 커스텀 신청 폼 생성' })
  create(@CurrentOperator() op: OperatorPrincipal, @Body() dto: CreateFormDto) {
    return this.forms.create(op.id, dto);
  }

  @Get()
  @ApiQuery({ name: 'campaignId', required: false })
  @ApiOperation({ summary: '폼 목록' })
  list(@CurrentOperator() op: OperatorPrincipal, @Query('campaignId', new ParseUUIDPipe({ optional: true })) campaignId?: string) {
    return this.forms.list(op.id, campaignId);
  }

  @Get(':id')
  @ApiOperation({ summary: '폼 상세 (배포 링크 포함)' })
  get(@CurrentOperator() op: OperatorPrincipal, @Param('id', ParseUUIDPipe) id: string) {
    return this.forms.get(op.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '폼 이름/상태 수정 (PAUSED 시 공개 접근 차단)' })
  update(@CurrentOperator() op: OperatorPrincipal, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateFormDto) {
    return this.forms.update(op.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: '폼 삭제' })
  remove(@CurrentOperator() op: OperatorPrincipal, @Param('id', ParseUUIDPipe) id: string) {
    return this.forms.remove(op.id, id);
  }
}
