import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentOperator, OperatorPrincipal } from '../common/current-operator.decorator';
import { LinksService } from './links.service';
import { CreateLinkDto } from './dto/create-link.dto';

@ApiTags('links')
@ApiCookieAuth('gu_admin')
@UseGuards(JwtAuthGuard)
@Controller('links')
export class LinksController {
  constructor(private readonly links: LinksService) {}

  @Post()
  @ApiOperation({ summary: '채널별 배포 링크 생성 (INSTAGRAM | X | YOUTUBE | THREADS). 응답에 공개 URL 포함' })
  create(@CurrentOperator() op: OperatorPrincipal, @Body() dto: CreateLinkDto) {
    return this.links.create(op.id, dto);
  }

  @Get()
  @ApiQuery({ name: 'formId', required: true })
  @ApiOperation({ summary: '폼의 배포 링크 목록' })
  list(@CurrentOperator() op: OperatorPrincipal, @Query('formId', ParseUUIDPipe) formId: string) {
    return this.links.listByForm(op.id, formId);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: '배포 링크 삭제 (기존 방문/신청은 link=null 로 보존)' })
  remove(@CurrentOperator() op: OperatorPrincipal, @Param('id', ParseUUIDPipe) id: string) {
    return this.links.remove(op.id, id);
  }
}
