import { Injectable } from '@nestjs/common';
import { Prisma } from '@glowuprizz/db';
import { CHANNELS, CHANNEL_LABELS, Channel, STAGES, Stage } from '@glowuprizz/shared';
import { PrismaService } from '../prisma/prisma.service';
import { OwnershipService } from '../common/ownership.service';
import { normalizePage } from '../common/pagination';
import { StatsQueryDto, VisitorsQueryDto } from './dto/stats-query.dto';
import { Period, resolvePeriod } from './period';
import { StageGroup, emptyGroup, funnelSnapshot, kstDay, num, rate, stageList } from './metrics';
import { loadJourney } from './journey';

interface Scope { operatorId: string; campaignId?: string; formId?: string; channel?: Channel }
type TypeRow = { key: string | null; type: string; visitors: bigint; events: bigint };

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService, private readonly own: OwnershipService) {}

  // ---------------------------------------------------------------- scope / SQL

  /** 필터의 캠페인/폼이 내 소유인지 확인하고 SQL 범위 객체로 */
  private async scope(operatorId: string, q: StatsQueryDto): Promise<Scope> {
    if (q.campaignId) await this.own.campaign(operatorId, q.campaignId);
    if (q.formId) await this.own.form(operatorId, q.formId);
    return { operatorId, campaignId: q.campaignId, formId: q.formId, channel: q.channel };
  }

  /**
   * 운영자 범위·필터·기간이 적용된 이벤트 CTE.
   * 컬럼: id, formId, linkId, visitorId, type, meta, createdAt, campaignId, channel
   */
  private ev(s: Scope, p: Period): Prisma.Sql {
    const conds: Prisma.Sql[] = [Prisma.sql`c."operatorId" = ${s.operatorId}`];
    if (s.campaignId) conds.push(Prisma.sql`c.id = ${s.campaignId}`);
    if (s.formId) conds.push(Prisma.sql`f.id = ${s.formId}`);
    if (s.channel) conds.push(Prisma.sql`dl.channel = ${s.channel}::"Channel"`);
    if (p.from) conds.push(Prisma.sql`e."createdAt" >= ${p.from}`);
    if (p.to) conds.push(Prisma.sql`e."createdAt" < ${p.to}`);
    return Prisma.sql`
      SELECT e.id, e."formId", e."linkId", e."visitorId", e.type, e.meta, e."createdAt", f."campaignId", dl.channel
      FROM events e
      JOIN forms f ON f.id = e."formId"
      JOIN campaigns c ON c.id = f."campaignId"
      LEFT JOIN distribution_links dl ON dl.id = e."linkId"
      WHERE ${Prisma.join(conds, ' AND ')}`;
  }

  /** key(그룹 컬럼) × type 별 고유 방문자/이벤트 수 → key 별 StageCounts */
  private async stageCountsBy(groupCol: Prisma.Sql | null, s: Scope, p: Period, extraWhere: Prisma.Sql = Prisma.empty) {
    const keyExpr = groupCol ?? Prisma.sql`NULL`;
    const rows = await this.prisma.$queryRaw<TypeRow[]>(Prisma.sql`
      WITH ev AS (${this.ev(s, p)})
      SELECT ${keyExpr}::text AS key, type::text AS type, COUNT(DISTINCT "visitorId") AS visitors, COUNT(*) AS events
      FROM ev ${extraWhere}
      GROUP BY 1, 2`);
    const byKey = new Map<string | null, StageGroup>();
    for (const r of rows) {
      const k = r.key;
      if (!byKey.has(k)) byKey.set(k, emptyGroup());
      const g = byKey.get(k)!;
      if ((STAGES as readonly string[]).includes(r.type)) {
        g.stages[r.type as Stage] = num(r.visitors);
        g.events[r.type as Stage] = num(r.events);
      } else if (r.type === 'SUBMIT_ERROR') g.errors = num(r.events);
    }
    return byKey;
  }

  /** 그룹 없이 전체 하나 */
  private async stageGroup(s: Scope, p: Period): Promise<StageGroup> {
    return (await this.stageCountsBy(null, s, p)).get(null) ?? emptyGroup();
  }

  /** 그룹 키별 집계를 엔티티 목록에 붙인다 (이벤트 없는 엔티티는 0) */
  private static attach<T>(list: T[], byKey: Map<string | null, StageGroup>, keyOf: (item: T) => string) {
    return list.map((item) => ({ item, g: byKey.get(keyOf(item)) ?? emptyGroup() }));
  }

  // ---------------------------------------------------------------- endpoints

  /** 5단계 퍼널 (고유 방문자). compare 면 직전 기간도. 최대 이탈 구간 표시. */
  async funnel(operatorId: string, q: StatsQueryDto) {
    const s = await this.scope(operatorId, q);
    const { range, current, previous } = resolvePeriod(q);
    const build = async (p: Period) => funnelSnapshot(await this.stageGroup(s, p));
    return { range, period: current, current: await build(current), previous: previous ? { period: previous, ...(await build(previous)) } : null };
  }

  /** 일별 추이 (KST). 방문자·신청·전환율. 빈 날은 0 으로 채움. */
  async timeseries(operatorId: string, q: StatsQueryDto) {
    const s = await this.scope(operatorId, q);
    const { current } = resolvePeriod(q);
    const rows = await this.prisma.$queryRaw<{ day: string; visitors: bigint; form_starts: bigint; submissions: bigint }[]>(Prisma.sql`
      WITH ev AS (${this.ev(s, current)})
      SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD') AS day,
             COUNT(DISTINCT "visitorId") FILTER (WHERE type = 'VIEW') AS visitors,
             COUNT(DISTINCT "visitorId") FILTER (WHERE type = 'FORM_START') AS form_starts,
             COUNT(DISTINCT "visitorId") FILTER (WHERE type = 'SUBMIT_SUCCESS') AS submissions
      FROM ev GROUP BY 1 ORDER BY 1`);
    const byDay = new Map(rows.map((r) => [r.day, r]));
    const days: string[] = [];
    if (current.from && current.to) {
      for (let t = current.from.getTime(); t < current.to.getTime(); t += 86_400_000) days.push(kstDay(new Date(t)));
    } else days.push(...byDay.keys());
    return days.map((day) => {
      const r = byDay.get(day);
      const visitors = num(r?.visitors), formStarts = num(r?.form_starts), submissions = num(r?.submissions);
      return { day, visitors, formStarts, submissions, conversionRate: rate(submissions, visitors) };
    });
  }

  /** 채널별 단계 수·전환·신청 기여. 4채널 항상 반환, 직접 유입 제외. */
  async channels(operatorId: string, q: StatsQueryDto) {
    const s = await this.scope(operatorId, q);
    const { current } = resolvePeriod(q);
    const byKey = await this.stageCountsBy(Prisma.sql`channel`, s, current, Prisma.sql`WHERE channel IS NOT NULL`);
    const totalSubmissions = [...byKey.values()].reduce((a, g) => a + g.stages.SUBMIT_SUCCESS, 0);
    return CHANNELS.map((channel) => {
      const g = byKey.get(channel) ?? emptyGroup();
      return {
        channel, ...g.stages, pageViews: g.events.VIEW, submitErrors: g.errors,
        clickToSubmit: rate(g.stages.SUBMIT_SUCCESS, g.stages.VIEW),
        startToSubmit: rate(g.stages.SUBMIT_SUCCESS, g.stages.FORM_START),
        share: rate(g.stages.SUBMIT_SUCCESS, totalSubmissions),
      };
    });
  }

  /** 캠페인별 요약 + 단계 수. 이벤트 없는 캠페인도 0 으로 포함. */
  async campaigns(operatorId: string, q: StatsQueryDto) {
    const s = await this.scope(operatorId, q);
    const { current } = resolvePeriod(q);
    const [byKey, list] = await Promise.all([
      this.stageCountsBy(Prisma.sql`"campaignId"`, s, current),
      this.prisma.campaign.findMany({
        where: { operatorId, ...(q.campaignId ? { id: q.campaignId } : {}) },
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, createdAt: true, _count: { select: { forms: true } }, forms: { select: { _count: { select: { links: true } } } } },
      }),
    ]);
    return StatsService.attach(list, byKey, (c) => c.id).map(({ item: c, g }) => {
      return {
        campaignId: c.id, campaignName: c.name, createdAt: c.createdAt,
        formsCount: c._count.forms, linksCount: c.forms.reduce((a, f) => a + f._count.links, 0),
        ...g.stages, pageViews: g.events.VIEW, conversionRate: rate(g.stages.SUBMIT_SUCCESS, g.stages.VIEW),
      };
    });
  }

  /** 링크별 성과. 같은 채널 안에서도 게시 위치별 비교. */
  async links(operatorId: string, q: StatsQueryDto) {
    const s = await this.scope(operatorId, q);
    const { current } = resolvePeriod(q);
    const [byKey, list] = await Promise.all([
      this.stageCountsBy(Prisma.sql`"linkId"`, s, current, Prisma.sql`WHERE "linkId" IS NOT NULL`),
      this.prisma.distributionLink.findMany({
        where: { form: { campaign: { operatorId }, ...(q.campaignId ? { campaignId: q.campaignId } : {}), ...(q.formId ? { id: q.formId } : {}) }, ...(q.channel ? { channel: q.channel } : {}) },
        orderBy: { createdAt: 'asc' },
        select: { id: true, channel: true, code: true, createdAt: true, form: { select: { id: true, name: true, slug: true } } },
      }),
    ]);
    return StatsService.attach(list, byKey, (l) => l.id).map(({ item: l, g }) => {
      return { linkId: l.id, channel: l.channel, code: l.code, createdAt: l.createdAt, form: l.form, ...g.stages, pageViews: g.events.VIEW, conversionRate: rate(g.stages.SUBMIT_SUCCESS, g.stages.VIEW) };
    });
  }

  /** 폼별 단계 전환율 (같은 캠페인의 템플릿 A/B 비교용). */
  async forms(operatorId: string, q: StatsQueryDto) {
    const s = await this.scope(operatorId, q);
    const { current } = resolvePeriod(q);
    const [byKey, list] = await Promise.all([
      this.stageCountsBy(Prisma.sql`"formId"`, s, current),
      this.prisma.form.findMany({
        where: { campaign: { operatorId }, ...(q.campaignId ? { campaignId: q.campaignId } : {}), ...(q.formId ? { id: q.formId } : {}) },
        orderBy: { createdAt: 'asc' },
        select: { id: true, name: true, slug: true, status: true, template: { select: { id: true, name: true } } },
      }),
    ]);
    return StatsService.attach(list, byKey, (f) => f.id).map(({ item: f, g }) => {
      return { formId: f.id, name: f.name, slug: f.slug, status: f.status, template: f.template, stages: stageList(g.stages), overallRate: rate(g.stages.SUBMIT_SUCCESS, g.stages.VIEW) };
    });
  }

  /** 요일×시간(KST) 링크 클릭 수. dow 0=일 … 6=토. */
  async heatmap(operatorId: string, q: StatsQueryDto) {
    const s = await this.scope(operatorId, q);
    const { current } = resolvePeriod(q);
    const rows = await this.prisma.$queryRaw<{ dow: number; hour: number; count: bigint }[]>(Prisma.sql`
      WITH ev AS (${this.ev(s, current)})
      SELECT EXTRACT(DOW FROM ts)::int AS dow, EXTRACT(HOUR FROM ts)::int AS hour, COUNT(*) AS count
      FROM (SELECT ("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul' AS ts FROM ev WHERE type = 'VIEW') t
      GROUP BY 1, 2`);
    const grid: number[][] = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
    for (const r of rows) grid[r.dow][r.hour] = num(r.count);
    return { grid, max: Math.max(0, ...rows.map((r) => num(r.count))) };
  }

  /** 제출 실패 사유 (meta.reason / meta.status). */
  async failures(operatorId: string, q: StatsQueryDto) {
    const s = await this.scope(operatorId, q);
    const { current } = resolvePeriod(q);
    const rows = await this.prisma.$queryRaw<{ reason: string | null; status: string | null; count: bigint }[]>(Prisma.sql`
      WITH ev AS (${this.ev(s, current)})
      SELECT meta->>'reason' AS reason, meta->>'status' AS status, COUNT(*) AS count
      FROM ev WHERE type = 'SUBMIT_ERROR' GROUP BY 1, 2 ORDER BY 3 DESC`);
    return rows.map((r) => ({ reason: r.reason ?? 'unknown', status: r.status ? Number(r.status) : null, count: num(r.count) }));
  }

  /** 방문자 품질: 재방문 후 신청 비율, 중복 전화번호, 봇 의심(폼 도달 없이 이탈). */
  async quality(operatorId: string, q: StatsQueryDto) {
    const s = await this.scope(operatorId, q);
    const { current } = resolvePeriod(q);
    const [revisit, dup, stagesMap] = await Promise.all([
      this.prisma.$queryRaw<{ once: bigint; multi: bigint; avg_visits: number | null }[]>(Prisma.sql`
        WITH ev AS (${this.ev(s, current)}),
        submitters AS (SELECT DISTINCT "visitorId" FROM ev WHERE type = 'SUBMIT_SUCCESS'),
        v AS (SELECT e."visitorId", COUNT(*) AS n FROM ev e JOIN submitters su ON su."visitorId" = e."visitorId" WHERE e.type = 'VIEW' GROUP BY 1)
        SELECT COUNT(*) FILTER (WHERE n = 1) AS once, COUNT(*) FILTER (WHERE n >= 2) AS multi, AVG(n)::float AS avg_visits FROM v`),
      this.prisma.$queryRaw<{ total: bigint; distinct_phones: bigint }[]>(Prisma.sql`
        WITH ev AS (${this.ev(s, current)})
        SELECT COUNT(*) AS total, COUNT(DISTINCT regexp_replace(su.payload->>'phone', '\\D', '', 'g')) AS distinct_phones
        FROM submissions su
        WHERE su."formId" IN (SELECT DISTINCT "formId" FROM ev) AND su.payload ? 'phone'
          ${current.from ? Prisma.sql`AND su."createdAt" >= ${current.from}` : Prisma.empty}
          ${current.to ? Prisma.sql`AND su."createdAt" < ${current.to}` : Prisma.empty}`),
      this.stageCountsBy(null, s, current),
    ]);
    const r = revisit[0], d = dup[0];
    const st = (stagesMap.get(null) ?? emptyGroup()).stages;
    const once = num(r?.once), multi = num(r?.multi);
    return {
      submittersOnce: once, submittersMulti: multi,
      onceRate: rate(once, once + multi), multiRate: rate(multi, once + multi),
      avgVisitsPerSubmitter: r?.avg_visits ? Math.round(r.avg_visits * 10) / 10 : 0,
      duplicatePhones: Math.max(0, num(d?.total) - num(d?.distinct_phones)),
      suspectedBots: Math.max(0, st.VIEW - st.FORM_VIEW), suspectedBotRate: rate(Math.max(0, st.VIEW - st.FORM_VIEW), st.VIEW),
    };
  }

  /** 규칙 기반 주목점. 채널·단계 수치에서 임계값 넘는 것만. */
  async insights(operatorId: string, q: StatsQueryDto) {
    const [f, ch] = await Promise.all([this.funnel(operatorId, q), this.channels(operatorId, q)]);
    const notes: { level: 'warn' | 'info'; text: string }[] = [];
    const cur = f.current;
    if (cur.stages[0].visitors < 20) return notes; // 표본 부족
    if (cur.maxDropStage) {
      const st = cur.stages.find((x) => x.type === cur.maxDropStage)!;
      const hint: Record<string, string> = {
        FORM_VIEW: '링크 미리보기·랜딩 속도·봇 유입 점검', FORM_START: '첫 화면에 입력칸이 보이는지, 카피·디자인 점검',
        SUBMIT_ATTEMPT: '필수 항목 수·동의 체크 위치 점검', SUBMIT_SUCCESS: '제출 실패 사유 확인',
      };
      notes.push({ level: 'warn', text: `${st.label} 단계 이탈 ${Math.round((1 - st.stepRate) * 100)}% 로 가장 큼 — ${hint[st.type] ?? ''}` });
    }
    const active = ch.filter((c) => c.VIEW >= 10);
    if (active.length >= 2) {
      const worstReach = active.reduce((a, b) => (rate(b.FORM_VIEW, b.VIEW) < rate(a.FORM_VIEW, a.VIEW) ? b : a));
      const reach = rate(worstReach.FORM_VIEW, worstReach.VIEW);
      if (reach < 0.9) notes.push({ level: 'warn', text: `${label(worstReach.channel)} 채널 폼 도달률 ${Math.round(reach * 100)}% 로 최저 — 링크 미리보기·랜딩 속도 점검` });
      const best = active.reduce((a, b) => (b.clickToSubmit > a.clickToSubmit ? b : a));
      notes.push({ level: 'info', text: `${label(best.channel)} 채널 전환율 ${Math.round(best.clickToSubmit * 100)}% 로 최고 (신청 기여 ${Math.round(best.share * 100)}%)` });
    }
    if (cur.submitErrors > 0 && cur.submitErrors >= cur.stages[4].visitors * 0.05) {
      notes.push({ level: 'warn', text: `제출 실패 ${cur.submitErrors}건 — 실패 사유 확인` });
    }
    return notes;
  }

  /** 단계까지 도달한 방문자 목록 (신청/미신청). 미신청 = 리마케팅 후보. */
  async visitors(operatorId: string, q: VisitorsQueryDto) {
    const s = await this.scope(operatorId, q);
    const { current } = resolvePeriod(q);
    const stage = q.stage ?? 'FORM_START';
    const submitted = q.submitted ?? false;
    const { page, pageSize, skip, take } = normalizePage(q.page, q.pageSize);
    type Row = { visitorId: string; formId: string; first_seen: Date; last_seen: Date; views: bigint; last_channel: Channel | null; last_stage: string; total: bigint };
    const rows = await this.prisma.$queryRaw<Row[]>(Prisma.sql`
      WITH ev AS (${this.ev(s, current)}),
      agg AS (
        SELECT "visitorId", (array_agg("formId" ORDER BY "createdAt" DESC))[1] AS "formId",
               MIN("createdAt") AS first_seen, MAX("createdAt") AS last_seen,
               COUNT(*) FILTER (WHERE type = 'VIEW') AS views,
               (array_agg(channel ORDER BY "createdAt" DESC) FILTER (WHERE channel IS NOT NULL))[1] AS last_channel,
               bool_or(type = ${stage}::"EventType") AS reached,
               bool_or(type = 'SUBMIT_SUCCESS') AS did_submit,
               CASE WHEN bool_or(type = 'SUBMIT_SUCCESS') THEN 'SUBMIT_SUCCESS'
                    WHEN bool_or(type = 'SUBMIT_ATTEMPT') THEN 'SUBMIT_ATTEMPT'
                    WHEN bool_or(type = 'FORM_START') THEN 'FORM_START'
                    WHEN bool_or(type = 'FORM_VIEW') THEN 'FORM_VIEW' ELSE 'VIEW' END AS last_stage
        FROM ev GROUP BY "visitorId"
      )
      SELECT "visitorId", "formId", first_seen, last_seen, views, last_channel, last_stage, COUNT(*) OVER() AS total
      FROM agg WHERE reached AND did_submit = ${submitted}
      ORDER BY last_seen DESC LIMIT ${take} OFFSET ${skip}`);
    const total = rows.length ? num(rows[0].total) : 0;
    const items = await Promise.all(rows.map(async (r) => ({
      visitorId: r.visitorId, formId: r.formId, firstSeen: r.first_seen, lastSeen: r.last_seen,
      views: num(r.views), lastChannel: r.last_channel, lastStage: r.last_stage,
      journey: await loadJourney(this.prisma, r.formId, r.visitorId),
    })));
    return { total, page, pageSize, items };
  }

  /** 운영자 전체 합계 (대시보드 상단 카드) — 하위 호환 */
  async overview(operatorId: string) {
    const g = await this.stageGroup({ operatorId }, { from: null, to: null });
    const [submissions, campaigns, forms] = await Promise.all([
      this.prisma.submission.count({ where: { form: { campaign: { operatorId } } } }),
      this.prisma.campaign.count({ where: { operatorId } }),
      this.prisma.form.count({ where: { campaign: { operatorId } } }),
    ]);
    return { visits: g.events.VIEW, visitors: g.stages.VIEW, submissions, campaigns, forms, conversionRate: rate(submissions, g.stages.VIEW) };
  }

}

const label = (c: Channel) => CHANNEL_LABELS[c];
