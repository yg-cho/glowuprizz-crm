import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Request } from 'express';
import { AUTH_COOKIE } from '@glowuprizz/shared';
import { OperatorPrincipal } from '../common/current-operator.decorator';

const cookieExtractor = (req: Request): string | null => req?.cookies?.[AUTH_COOKIE] ?? null;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: cookieExtractor,
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: { sub: string; email: string }): OperatorPrincipal {
    return { id: payload.sub, email: payload.email };
  }
}
