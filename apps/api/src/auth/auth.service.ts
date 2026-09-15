import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

// 계정이 없어도 같은 비용의 비교를 수행해 응답 시간으로 계정 열거를 못 하게 한다
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', 10);

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const operator = await this.prisma.operator.findUnique({ where: { email } });
    // 존재 여부와 비밀번호 불일치를 메시지·응답 시간 모두에서 구분하지 않음 (계정 열거 방지)
    const ok = await bcrypt.compare(password, operator?.passwordHash ?? DUMMY_HASH);
    if (!operator || !ok) throw new UnauthorizedException('Invalid credentials');
    const token = await this.jwt.signAsync({ sub: operator.id, email: operator.email });
    return { token, operator: { id: operator.id, email: operator.email } };
  }
}
