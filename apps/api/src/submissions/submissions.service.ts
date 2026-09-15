import { Injectable } from '@nestjs/common';
import { Channel } from '@glowuprizz/shared';
import { PrismaService } from '../prisma/prisma.service';
import { OwnershipService } from '../common/ownership.service';
import { normalizePage } from '../common/pagination';
import { loadJourney } from '../stats/journey';

export interface SubmissionListQuery { formId?: string; campaignId?: string; channel?: Channel; page?: number; pageSize?: number }

@Injectable()
export class SubmissionsService {
  constructor(private readonly prisma: PrismaService, private readonly own: OwnershipService) {}

  /** 신청 1건의 방문자 여정. 방문자 쿠키 없이 제출된 건은 이벤트가 없다. */
  async journey(operatorId: string, id: string) {
    const sub = await this.own.submission(operatorId, id);
    const events = sub.visitorId ? await loadJourney(this.prisma, sub.formId, sub.visitorId) : [];
    const first = events[0]?.createdAt ?? sub.createdAt;
    return {
      submission: sub,
      events,
      visits: events.filter((e) => e.type === 'VIEW').length,
      secondsToSubmit: Math.max(0, Math.round((sub.createdAt.getTime() - first.getTime()) / 1000)),
    };
  }

  async list(operatorId: string, q: SubmissionListQuery) {
    if (q.formId) await this.own.form(operatorId, q.formId);
    if (q.campaignId) await this.own.campaign(operatorId, q.campaignId);
    const { page, pageSize, skip, take } = normalizePage(q.page, q.pageSize);
    const where = {
      form: { campaign: { operatorId }, ...(q.campaignId ? { campaignId: q.campaignId } : {}) },
      ...(q.formId ? { formId: q.formId } : {}),
      ...(q.channel ? { link: { channel: q.channel } } : {}),
    };
    const [total, items] = await Promise.all([
      this.prisma.submission.count({ where }),
      this.prisma.submission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          form: { select: { id: true, name: true, slug: true, campaign: { select: { id: true, name: true } } } },
          link: { select: { id: true, channel: true, code: true } },
        },
      }),
    ]);
    return { total, page, pageSize, items };
  }
}
