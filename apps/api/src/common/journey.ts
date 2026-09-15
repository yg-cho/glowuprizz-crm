import { EVENT_RANK, EventType } from '@glowuprizz/shared';
import { PrismaService } from '../prisma/prisma.service';

/** 같은 밀리초에 찍힌 이벤트(비콘이 제출 응답 뒤에 도착)는 단계 순서로 정렬 */
export function sortJourney<T extends { type: EventType; createdAt: Date }>(events: T[]): T[] {
  return [...events].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || EVENT_RANK[a.type] - EVENT_RANK[b.type]);
}

/** 방문자의 폼 내 이벤트 타임라인 */
export async function loadJourney(prisma: PrismaService, formId: string, visitorId: string) {
  const events = await prisma.event.findMany({
    where: { formId, visitorId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, type: true, meta: true, createdAt: true, link: { select: { id: true, channel: true, code: true } } },
  });
  return sortJourney(events);
}

/** 여러 (formId, visitorId) 쌍의 여정을 한 번에. 키 = `${formId}:${visitorId}` */
export async function loadJourneys(prisma: PrismaService, pairs: { formId: string; visitorId: string }[]) {
  if (pairs.length === 0) return new Map<string, Awaited<ReturnType<typeof loadJourney>>>();
  const events = await prisma.event.findMany({
    where: { OR: pairs.map((p) => ({ formId: p.formId, visitorId: p.visitorId })) },
    orderBy: { createdAt: 'asc' },
    select: { id: true, formId: true, visitorId: true, type: true, meta: true, createdAt: true, link: { select: { id: true, channel: true, code: true } } },
  });
  const map = new Map<string, typeof events>();
  for (const e of events) {
    const k = `${e.formId}:${e.visitorId}`;
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(e);
  }
  for (const [k, list] of map) map.set(k, sortJourney(list));
  return map;
}
