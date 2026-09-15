import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentOperator, OperatorPrincipal } from '../common/current-operator.decorator';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';

@ApiTags('campaigns')
@ApiCookieAuth('gu_admin')
@UseGuards(JwtAuthGuard)
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @Post()
  @ApiOperation({ summary: '캠페인 생성' })
  create(@CurrentOperator() op: OperatorPrincipal, @Body() dto: CreateCampaignDto) {
    return this.campaigns.create(op.id, dto);
  }

  @Get()
  @ApiOperation({ summary: '캠페인 목록' })
  list(@CurrentOperator() op: OperatorPrincipal) {
    return this.campaigns.list(op.id);
  }

  @Get(':id')
  @ApiOperation({ summary: '캠페인 상세 (폼 목록 포함)' })
  get(@CurrentOperator() op: OperatorPrincipal, @Param('id', ParseUUIDPipe) id: string) {
    return this.campaigns.get(op.id, id);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: '캠페인 삭제 (하위 폼/링크/데이터 cascade)' })
  remove(@CurrentOperator() op: OperatorPrincipal, @Param('id', ParseUUIDPipe) id: string) {
    return this.campaigns.remove(op.id, id);
  }
}
