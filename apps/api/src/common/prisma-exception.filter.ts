import { ArgumentsHost, Catch, ConflictException, ExceptionFilter, HttpException, NotFoundException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '@glowuprizz/db';

/**
 * Prisma 의 알려진 오류를 HTTP 로. check-then-act 로 미리 조회하지 않고 제약 조건에 맡긴다(경합에도 안전).
 * P2002 유니크 위반 → 409, P2003 FK 위반(참조 중 삭제) → 409, P2025 대상 없음 → 404
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter extends BaseExceptionFilter implements ExceptionFilter {
  catch(e: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const mapped = toHttp(e);
    super.catch(mapped ?? e, host);
  }
}

function toHttp(e: Prisma.PrismaClientKnownRequestError): HttpException | null {
  const target = (e.meta?.target as string[] | undefined)?.join(', ');
  switch (e.code) {
    case 'P2002': return new ConflictException(target ? `${target} already in use` : 'already in use');
    case 'P2003': return new ConflictException('referenced by other records');
    case 'P2025': return new NotFoundException('not found');
    default: return null;
  }
}
