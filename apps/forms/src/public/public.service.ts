import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

const MAX_FIELDS = 50;
const MAX_VALUE_LEN = 2000;

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

  hashIp(ip: string | undefined) {
    if (!ip) return null;
    return createHash('sha256').update(ip + (process.env.IP_HASH_SALT ?? 'salt')).digest('hex').slice(0, 32);
  }

  /** /l/:code → 링크 + 폼 + 템플릿 */
  async resolveLink(code: string) {
    const link = await this.prisma.distributionLink.findUnique({
      where: { code },
      include: { form: { include: { template: true } } },
    });
    if (!link) throw new NotFoundException('link not found');
    if (link.form.status !== 'ACTIVE') throw new ForbiddenException('form is paused');
    return link;
  }

  /** /f/:slug → 폼 + 템플릿 (채널 없음) */
  async resolveForm(slug: string) {
    const form = await this.prisma.form.findUnique({ where: { slug }, include: { template: true } });
    if (!form) throw new NotFoundException('form not found');
    if (form.status !== 'ACTIVE') throw new ForbiddenException('form is paused');
    return form;
  }

  recordVisit(input: { formId: string; linkId: string | null; visitorId: string; ip?: string; userAgent?: string }) {
    return this.prisma.visit.create({
      data: {
        formId: input.formId,
        linkId: input.linkId,
        visitorId: input.visitorId,
        ipHash: this.hashIp(input.ip),
        userAgent: input.userAgent?.slice(0, 500),
      },
    });
  }

  async submit(slug: string, linkCode: string | null | undefined, fields: Record<string, unknown>, visitorId: string | null, ip?: string) {
    const form = await this.resolveForm(slug);

    const keys = Object.keys(fields);
    if (keys.length === 0) throw new BadRequestException('fields must not be empty');
    if (keys.length > MAX_FIELDS) throw new BadRequestException(`too many fields (max ${MAX_FIELDS})`);
    const payload: Record<string, string | string[]> = {};
    for (const k of keys) {
      const v = fields[k];
      if (typeof v === 'string') payload[k] = v.slice(0, MAX_VALUE_LEN);
      else if (Array.isArray(v) && v.every((x) => typeof x === 'string')) payload[k] = (v as string[]).map((x) => x.slice(0, MAX_VALUE_LEN));
      else throw new BadRequestException(`field "${k}" must be string or string[]`);
    }

    let linkId: string | null = null;
    if (linkCode) {
      // 링크가 이 폼에 속할 때만 채널 귀속. 다른 폼 코드는 무시(오염 방지).
      const link = await this.prisma.distributionLink.findUnique({ where: { code: linkCode } });
      if (link && link.formId === form.id) linkId = link.id;
    }

    const s = await this.prisma.submission.create({
      data: { formId: form.id, linkId, visitorId, payload, ipHash: this.hashIp(ip) },
      select: { id: true, createdAt: true },
    });
    return s;
  }
}
