import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventType, Prisma } from '@glowuprizz/db';
import { CLIENT_EVENT_MAP } from '@glowuprizz/shared';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EventDto } from './dto/event.dto';
import { SubmitDto } from './dto/submit.dto';
import { RequestContext } from './visitor';

const MAX_FIELDS = 50;
const MAX_VALUE_LEN = 2000;
const MAX_META_BYTES = 1024;
const MAX_UA_LEN = 500;

type Payload = Record<string, string | string[]>;

@Injectable()
export class PublicService {
  private readonly ipSalt: string;

  constructor(private readonly prisma: PrismaService, config: ConfigService) {
    this.ipSalt = config.get<string>('IP_HASH_SALT', 'salt');
  }

  /** IP 원문은 저장하지 않는다. salted sha256 앞 32자. */
  private hashIp(ip?: string) {
    return ip ? createHash('sha256').update(ip + this.ipSalt).digest('hex').slice(0, 32) : null;
  }

  /** 이벤트 한 건 기록 (VIEW / 클라이언트 4종 / SUBMIT_SUCCESS 공용) */
  private eventData(formId: string, linkId: string | null, visitorId: string, type: EventType, ctx: RequestContext, meta?: Prisma.InputJsonValue) {
    return { formId, linkId, visitorId, type, meta, ipHash: this.hashIp(ctx.ip), userAgent: ctx.userAgent?.slice(0, MAX_UA_LEN) };
  }

  // ---------------------------------------------------------------- 조회

  /** /l/:code → 링크 + 폼 + 템플릿. 일시중지 폼은 403. */
  async resolveLink(code: string) {
    const link = await this.prisma.distributionLink.findUnique({ where: { code }, include: { form: { include: { template: true } } } });
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

  /** 링크 코드가 이 폼에 속할 때만 채널 귀속. 다른 폼 코드는 무시(오염 방지). */
  private async resolveLinkId(formId: string, linkCode?: string | null): Promise<string | null> {
    if (!linkCode) return null;
    const link = await this.prisma.distributionLink.findUnique({ where: { code: linkCode }, select: { id: true, formId: true } });
    return link?.formId === formId ? link.id : null;
  }

  // ---------------------------------------------------------------- 기록

  /** 페이지 렌더 = 링크 클릭(VIEW) */
  recordView(formId: string, linkId: string | null, visitorId: string, ctx: RequestContext) {
    return this.prisma.event.create({ data: this.eventData(formId, linkId, visitorId, 'VIEW', ctx) });
  }

  /** 주입 스크립트가 보내는 퍼널 이벤트. 방문자 쿠키 없으면 집계 불가 → 무시. */
  async recordClientEvent(slug: string, dto: EventDto, ctx: RequestContext) {
    if (!ctx.visitorId) return;
    const form = await this.resolveForm(slug);
    const meta = (dto.meta ?? {}) as Prisma.InputJsonValue;
    if (Buffer.byteLength(JSON.stringify(meta), 'utf8') > MAX_META_BYTES) {
      throw new BadRequestException(`meta too large (max ${MAX_META_BYTES} bytes)`);
    }
    const linkId = await this.resolveLinkId(form.id, dto.linkCode);
    await this.prisma.event.create({ data: this.eventData(form.id, linkId, ctx.visitorId, CLIENT_EVENT_MAP[dto.type], ctx, meta) });
  }

  /** 신청 저장 + SUBMIT_SUCCESS 이벤트 (한 트랜잭션) */
  async submit(slug: string, dto: SubmitDto, ctx: RequestContext) {
    const form = await this.resolveForm(slug);
    const payload = this.sanitizePayload(dto.fields);
    const linkId = await this.resolveLinkId(form.id, dto.linkCode);
    const ipHash = this.hashIp(ctx.ip);

    return this.prisma.$transaction(async (tx) => {
      const s = await tx.submission.create({
        data: { formId: form.id, linkId, visitorId: ctx.visitorId, payload, ipHash },
        select: { id: true, createdAt: true },
      });
      if (ctx.visitorId) {
        await tx.event.create({ data: this.eventData(form.id, linkId, ctx.visitorId, 'SUBMIT_SUCCESS', ctx, { submissionId: s.id }) });
      }
      return s;
    });
  }

  /** 필드 수·값 길이 제한, string | string[] 만 허용 */
  private sanitizePayload(fields: Record<string, unknown>): Payload {
    const keys = Object.keys(fields ?? {});
    if (keys.length === 0) throw new BadRequestException('fields must not be empty');
    if (keys.length > MAX_FIELDS) throw new BadRequestException(`too many fields (max ${MAX_FIELDS})`);
    const payload: Payload = {};
    for (const k of keys) {
      const v = fields[k];
      if (typeof v === 'string') payload[k] = v.slice(0, MAX_VALUE_LEN);
      else if (Array.isArray(v) && v.every((x) => typeof x === 'string')) payload[k] = (v as string[]).map((x) => x.slice(0, MAX_VALUE_LEN));
      else throw new BadRequestException(`field "${k}" must be string or string[]`);
    }
    return payload;
  }
}
