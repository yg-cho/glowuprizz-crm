import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubmissionsService {
  constructor(private readonly prisma: PrismaService) {}

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
