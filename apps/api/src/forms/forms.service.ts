import { ConflictException, Injectable } from '@nestjs/common';
import { customAlphabet } from 'nanoid';
import { PrismaService } from '../prisma/prisma.service';
import { OwnershipService } from '../common/ownership.service';
import { CreateFormDto } from './dto/create-form.dto';
import { UpdateFormDto } from './dto/update-form.dto';

const slugId = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 8);

const FORM_INCLUDE = {
  campaign: { select: { id: true, name: true } },
  template: { select: { id: true, name: true } },
} as const;

@Injectable()
export class FormsService {
  constructor(private readonly prisma: PrismaService, private readonly own: OwnershipService) {}

  async create(operatorId: string, dto: CreateFormDto) {
    await Promise.all([this.own.campaign(operatorId, dto.campaignId), this.own.template(operatorId, dto.templateId)]);
    const slug = dto.slug ?? slugId();
    if (await this.prisma.form.findUnique({ where: { slug } })) throw new ConflictException('slug already in use');
    return this.prisma.form.create({ data: { campaignId: dto.campaignId, templateId: dto.templateId, name: dto.name, slug } });
  }

  list(operatorId: string, campaignId?: string) {
    return this.prisma.form.findMany({
      where: { campaign: { operatorId }, ...(campaignId ? { campaignId } : {}) },
      orderBy: { createdAt: 'desc' },
      include: { ...FORM_INCLUDE, _count: { select: { links: true, submissions: true } } },
    });
  }

  async get(operatorId: string, id: string) {
    await this.own.form(operatorId, id);
    return this.prisma.form.findUniqueOrThrow({ where: { id }, include: { ...FORM_INCLUDE, links: { orderBy: { createdAt: 'asc' } } } });
  }

  async update(operatorId: string, id: string, dto: UpdateFormDto) {
    await this.own.form(operatorId, id);
    return this.prisma.form.update({ where: { id }, data: dto });
  }

  async remove(operatorId: string, id: string) {
    await this.own.form(operatorId, id);
    await this.prisma.form.delete({ where: { id } });
  }
}
