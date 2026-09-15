import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubmissionsService {
  constructor(private readonly prisma: PrismaService) {}

  /** 신청 1건의 방문자 여정 (같은 폼 내 이벤트 타임라인). 방문자 쿠키 없이 제출된 건은 빈 배열. */
  async journey(operatorId: string, id: string) {
    const sub = await this.prisma.submission.findFirst({
      where: { id, form: { campaign: { operatorId } } },
      select: { id: true, formId: true, visitorId: true, createdAt: true, link: { select: { id: true, channel: true, code: true } } },
    });
    if (!sub) throw new NotFoundException('submission not found');
    const events = sub.visitorId
      ? await this.prisma.event.findMany({
          where: { formId: sub.formId, visitorId: sub.visitorId }, orderBy: { createdAt: 'asc' },
          select: { id: true, type: true, meta: true, createdAt: true, link: { select: { id: true, channel: true, code: true } } },
        })
      : [];
    const first = events[0]?.createdAt ?? sub.createdAt;
    return {
      submission: sub, events,
      visits: events.filter((e) => e.type === 'VIEW').length,
      secondsToSubmit: Math.max(0, Math.round((sub.createdAt.getTime() - first.getTime()) / 1000)),
    };
  }

  async list(operatorId: string, opts: { formId?: string; campaignId?: string; page: number; pageSize: number }) {
    if (opts.formId) {
      const f = await this.prisma.form.findFirst({ where: { id: opts.formId, campaign: { operatorId } } });
      if (!f) throw new NotFoundException('form not found');
    }
    if (opts.campaignId) {
      const c = await this.prisma.campaign.findFirst({ where: { id: opts.campaignId, operatorId } });
      if (!c) throw new NotFoundException('campaign not found');
    }
    const where = {
      form: { campaign: { operatorId }, ...(opts.campaignId ? { campaignId: opts.campaignId } : {}) },
      ...(opts.formId ? { formId: opts.formId } : {}),
    };
    const [total, items] = await Promise.all([
      this.prisma.submission.count({ where }),
      this.prisma.submission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (opts.page - 1) * opts.pageSize,
        take: opts.pageSize,
        include: {
          form: { select: { id: true, name: true, slug: true, campaign: { select: { id: true, name: true } } } },
          link: { select: { id: true, channel: true, code: true } },
        },
      }),
    ]);
    return { total, page: opts.page, pageSize: opts.pageSize, items };
  }
}
