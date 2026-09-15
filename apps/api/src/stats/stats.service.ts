import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@glowuprizz/db';
import { CampaignStats, ChannelStats, Channel, CHANNELS } from '@glowuprizz/shared';
import { PrismaService } from '../prisma/prisma.service';

type Row = { key: string; visits: bigint; visitors: bigint; submissions: bigint };

const rate = (s: number, v: number) => (v === 0 ? 0 : Math.round((s / v) * 10000) / 10000);

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  /** 캠페인별 방문 / 방문자(고유 visitorId) / 신청 / 전환율 */
  async byCampaign(operatorId: string): Promise<CampaignStats[]> {
    const rows = await this.prisma.$queryRaw<Row[]>(Prisma.sql`
      SELECT c.id AS key,
             COALESCE(v.visits, 0)      AS visits,
             COALESCE(v.visitors, 0)    AS visitors,
             COALESCE(s.submissions, 0) AS submissions
      FROM campaigns c
      LEFT JOIN (
        SELECT f."campaignId", COUNT(*) AS visits, COUNT(DISTINCT vi."visitorId") AS visitors
        FROM visits vi JOIN forms f ON f.id = vi."formId"
        GROUP BY f."campaignId"
      ) v ON v."campaignId" = c.id
      LEFT JOIN (
        SELECT f."campaignId", COUNT(*) AS submissions
        FROM submissions su JOIN forms f ON f.id = su."formId"
        GROUP BY f."campaignId"
      ) s ON s."campaignId" = c.id
      WHERE c."operatorId" = ${operatorId}
      ORDER BY c."createdAt" DESC
    `);
    const names = await this.prisma.campaign.findMany({ where: { operatorId }, select: { id: true, name: true } });
    const nameMap = new Map(names.map((n) => [n.id, n.name]));
    return rows.map((r) => {
      const visits = Number(r.visits), visitors = Number(r.visitors), submissions = Number(r.submissions);
      return { campaignId: r.key, campaignName: nameMap.get(r.key) ?? '', visits, visitors, submissions, conversionRate: rate(submissions, visitors) };
    });
  }

  /** 채널별 성과. campaignId 주면 해당 캠페인만, 아니면 운영자 전체 */
  async byChannel(operatorId: string, campaignId?: string): Promise<ChannelStats[]> {
    if (campaignId) {
      const c = await this.prisma.campaign.findFirst({ where: { id: campaignId, operatorId } });
      if (!c) throw new NotFoundException('campaign not found');
    }
    const campaignFilter = campaignId ? Prisma.sql`AND f."campaignId" = ${campaignId}` : Prisma.empty;
    const rows = await this.prisma.$queryRaw<Row[]>(Prisma.sql`
      SELECT ch.channel::text AS key,
             COALESCE(v.visits, 0)      AS visits,
             COALESCE(v.visitors, 0)    AS visitors,
             COALESCE(s.submissions, 0) AS submissions
      FROM (SELECT unnest(enum_range(NULL::"Channel")) AS channel) ch
      LEFT JOIN (
        SELECT dl.channel, COUNT(*) AS visits, COUNT(DISTINCT vi."visitorId") AS visitors
        FROM visits vi
        JOIN distribution_links dl ON dl.id = vi."linkId"
        JOIN forms f ON f.id = vi."formId"
        JOIN campaigns c ON c.id = f."campaignId"
        WHERE c."operatorId" = ${operatorId} ${campaignFilter}
        GROUP BY dl.channel
      ) v ON v.channel = ch.channel
      LEFT JOIN (
        SELECT dl.channel, COUNT(*) AS submissions
        FROM submissions su
        JOIN distribution_links dl ON dl.id = su."linkId"
        JOIN forms f ON f.id = su."formId"
        JOIN campaigns c ON c.id = f."campaignId"
        WHERE c."operatorId" = ${operatorId} ${campaignFilter}
        GROUP BY dl.channel
      ) s ON s.channel = ch.channel
    `);
    const byKey = new Map(rows.map((r) => [r.key, r]));
    return CHANNELS.map((channel: Channel) => {
      const r = byKey.get(channel);
      const visits = Number(r?.visits ?? 0), visitors = Number(r?.visitors ?? 0), submissions = Number(r?.submissions ?? 0);
      return { channel, visits, visitors, submissions, conversionRate: rate(submissions, visitors) };
    });
  }

  /** 운영자 전체 합계 (대시보드 상단 카드) */
  async overview(operatorId: string) {
    const [visits, visitorsRows, submissions, campaigns, forms] = await Promise.all([
      this.prisma.visit.count({ where: { form: { campaign: { operatorId } } } }),
      this.prisma.visit.findMany({ where: { form: { campaign: { operatorId } } }, distinct: ['visitorId'], select: { visitorId: true } }),
      this.prisma.submission.count({ where: { form: { campaign: { operatorId } } } }),
      this.prisma.campaign.count({ where: { operatorId } }),
      this.prisma.form.count({ where: { campaign: { operatorId } } }),
    ]);
    const visitors = visitorsRows.length;
    return { visits, visitors, submissions, campaigns, forms, conversionRate: rate(submissions, visitors) };
  }
}
