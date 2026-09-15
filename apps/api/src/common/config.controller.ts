import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { OperatorApi } from './operator-api.decorator';

/** 관리자 화면이 필요로 하는 서버 설정. 비밀값 없음. */
@ApiTags('config')
@OperatorApi()
@Controller('config')
export class ConfigController {
  constructor(private readonly config: ConfigService) {}

  @Get()
  @ApiOperation({ summary: '공개 폼 서버 origin 등 화면 설정' })
  get() {
    return { formsPublicOrigin: this.config.get<string>('FORMS_PUBLIC_ORIGIN', 'http://localhost:3002').replace(/\/$/, '') };
  }
}
