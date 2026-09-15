import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const operator = await this.prisma.operator.findUnique({ where: { email } });
    // 존재 여부와 비밀번호 불일치를 구분하지 않음 (계정 열거 방지)
    if (!operator || !(await bcrypt.compare(password, operator.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const token = await this.jwt.signAsync({ sub: operator.id, email: operator.email });
    return { token, operator: { id: operator.id, email: operator.email } };
  }
}
