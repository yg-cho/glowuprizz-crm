import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * 운영자 소유권 확인. 존재 확인만 필요하므로 id 만 읽는다 (template 은 html 원문이 필요해 전체). 남의 리소스는 존재 여부를 숨기기 위해 항상 404.
 * 모든 도메인 서비스가 이 클래스를 통해 확인하므로 IDOR 검사가 한곳에 모인다.
 */
@Injectable()
export class OwnershipService {
  constructor(private readonly prisma: PrismaService) {}

  async campaign(operatorId: string, id: string) {
    const c = await this.prisma.campaign.findFirst({ where: { id, operatorId }, select: { id: true } });
    if (!c) throw new NotFoundException('campaign not found');
    return c;
  }

  async template(operatorId: string, id: string) {
    const t = await this.prisma.htmlTemplate.findFirst({ where: { id, operatorId } });
    if (!t) throw new NotFoundException('template not found');
    return t;
  }

  async form(operatorId: string, id: string) {
    const f = await this.prisma.form.findFirst({ where: { id, campaign: { operatorId } }, select: { id: true } });
    if (!f) throw new NotFoundException('form not found');
    return f;
  }

  async link(operatorId: string, id: string) {
    const l = await this.prisma.distributionLink.findFirst({ where: { id, form: { campaign: { operatorId } } }, select: { id: true } });
    if (!l) throw new NotFoundException('link not found');
    return l;
  }

  async submission(operatorId: string, id: string) {
    const s = await this.prisma.submission.findFirst({
      where: { id, form: { campaign: { operatorId } } },
      select: { id: true, formId: true, visitorId: true, createdAt: true, link: { select: { id: true, channel: true, code: true } } },
    });
    if (!s) throw new NotFoundException('submission not found');
    return s;
  }
}
