import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiCookieAuth } from '@nestjs/swagger';
import { AUTH_COOKIE } from '@glowuprizz/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

/** 운영자 전용 컨트롤러: JWT 쿠키 가드 + Swagger 쿠키 인증 표기 */
export function OperatorApi() {
  return applyDecorators(ApiCookieAuth(AUTH_COOKIE), UseGuards(JwtAuthGuard));
}
