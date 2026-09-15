import {
  Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post,
  UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { MAX_HTML_BYTES } from '@glowuprizz/shared';
import { CurrentOperator, OperatorPrincipal } from '../common/current-operator.decorator';
import { OperatorApi } from '../common/operator-api.decorator';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { validateHtmlUpload } from './html-validator';

@ApiTags('templates')
@OperatorApi()
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templates: TemplatesService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_HTML_BYTES } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'AI로 만든 단일 .html 파일 등록' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary', description: '.html, ≤512KB, <form> 포함' },
        name: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 201, description: '등록됨' })
  @ApiResponse({ status: 400, description: '확장자/크기/폼 요소 검증 실패' })
  async upload(
    @CurrentOperator() op: OperatorPrincipal,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateTemplateDto,
  ) {
    const html = validateHtmlUpload(file);
    const name = dto.name?.trim() || file.originalname.replace(/\.html?$/i, '');
    return this.templates.create(op.id, name, html);
  }

  @Get()
  @ApiOperation({ summary: '내 템플릿 목록' })
  list(@CurrentOperator() op: OperatorPrincipal) {
    return this.templates.list(op.id);
  }

  @Get(':id')
  @ApiOperation({ summary: '템플릿 상세 (html 원문 포함)' })
  get(@CurrentOperator() op: OperatorPrincipal, @Param('id', ParseUUIDPipe) id: string) {
    return this.templates.get(op.id, id);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: '템플릿 삭제 (사용 중인 폼 없을 때만)' })
  remove(@CurrentOperator() op: OperatorPrincipal, @Param('id', ParseUUIDPipe) id: string) {
    return this.templates.remove(op.id, id);
  }
}
