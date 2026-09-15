import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AUTH_COOKIE, isSecureRequest } from '@glowuprizz/shared';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentOperator, OperatorPrincipal } from '../common/current-operator.decorator';

const COOKIE_MAX_AGE_MS = 1000 * 60 * 60 * 12; // 12h

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: '운영자 로그인. 성공 시 httpOnly 쿠키(gu_admin) 발급' })
  @ApiResponse({ status: 200, description: '로그인 성공' })
  @ApiResponse({ status: 401, description: '이메일 또는 비밀번호 불일치' })
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { token, operator } = await this.auth.login(dto.email, dto.password);
    res.cookie(AUTH_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isSecureRequest(req),
      maxAge: COOKIE_MAX_AGE_MS,
      path: '/',
    });
    return { operator };
  }

  @Post('logout')
  @HttpCode(204)
  @ApiOperation({ summary: '로그아웃. 쿠키 제거' })
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(AUTH_COOKIE, { path: '/' });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('gu_admin')
  @ApiOperation({ summary: '현재 로그인한 운영자' })
  @ApiResponse({ status: 401, description: '미인증' })
  me(@CurrentOperator() operator: OperatorPrincipal) {
    return { operator };
  }
}
