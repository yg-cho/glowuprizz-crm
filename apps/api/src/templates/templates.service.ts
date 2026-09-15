import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OwnershipService } from '../common/ownership.service';

const TEMPLATE_SUMMARY = { id: true, name: true, sizeBytes: true, createdAt: true } as const;

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService, private readonly own: OwnershipService) {}

  create(operatorId: string, name: string, html: string) {
    return this.prisma.htmlTemplate.create({
      data: { operatorId, name, html, sizeBytes: Buffer.byteLength(html, 'utf8') },
      select: TEMPLATE_SUMMARY,
    });
  }

  list(operatorId: string) {
    return this.prisma.htmlTemplate.findMany({
      where: { operatorId },
      orderBy: { createdAt: 'desc' },
      select: { ...TEMPLATE_SUMMARY, _count: { select: { forms: true } } },
    });
  }

  get(operatorId: string, id: string) {
    return this.own.template(operatorId, id);
  }

  async remove(operatorId: string, id: string) {
    await this.own.template(operatorId, id);
    const inUse = await this.prisma.form.count({ where: { templateId: id } });
    if (inUse > 0) throw new ConflictException('template is used by forms; delete forms first');
    await this.prisma.htmlTemplate.delete({ where: { id } });
  }
}
