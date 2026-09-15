import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Request } from 'express';
import { AUTH_COOKIE } from '@glowuprizz/shared';
import { OperatorPrincipal } from '../common/current-operator.decorator';
import { PrismaService } from '../prisma/prisma.service';

const cookieExtractor = (req: Request): string | null => req?.cookies?.[AUTH_COOKIE] ?? null;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: cookieExtractor,
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /** 서명이 유효해도 삭제된 운영자의 토큰은 거부한다 */
  async validate(payload: { sub: string; email: string }): Promise<OperatorPrincipal> {
    const op = await this.prisma.operator.findUnique({ where: { id: payload.sub }, select: { id: true, email: true } });
    if (!op) throw new UnauthorizedException();
    return op;
  }
}
