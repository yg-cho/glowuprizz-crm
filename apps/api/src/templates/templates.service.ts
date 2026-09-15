import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  create(operatorId: string, name: string, html: string) {
    return this.prisma.htmlTemplate.create({
      data: { operatorId, name, html, sizeBytes: Buffer.byteLength(html, 'utf8') },
      select: { id: true, name: true, sizeBytes: true, createdAt: true },
    });
  }

  list(operatorId: string) {
    return this.prisma.htmlTemplate.findMany({
      where: { operatorId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, sizeBytes: true, createdAt: true, _count: { select: { forms: true } } },
    });
  }

  async get(operatorId: string, id: string) {
    const t = await this.prisma.htmlTemplate.findFirst({ where: { id, operatorId } });
    if (!t) throw new NotFoundException('template not found');
    return t;
  }

  async remove(operatorId: string, id: string) {
    await this.get(operatorId, id);
    const inUse = await this.prisma.form.count({ where: { templateId: id } });
    if (inUse > 0) {
      throw new NotFoundException('template is used by forms; delete forms first');
    }
    await this.prisma.htmlTemplate.delete({ where: { id } });
  }
}
