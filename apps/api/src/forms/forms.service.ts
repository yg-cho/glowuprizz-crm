import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { customAlphabet } from 'nanoid';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFormDto } from './dto/create-form.dto';
import { UpdateFormDto } from './dto/update-form.dto';

const slugId = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 8);

@Injectable()
export class FormsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(operatorId: string, dto: CreateFormDto) {
    // 캠페인/템플릿 모두 이 운영자 소유인지 확인 (IDOR 방지)
    const [campaign, template] = await Promise.all([
      this.prisma.campaign.findFirst({ where: { id: dto.campaignId, operatorId } }),
      this.prisma.htmlTemplate.findFirst({ where: { id: dto.templateId, operatorId } }),
    ]);
    if (!campaign) throw new NotFoundException('campaign not found');
    if (!template) throw new NotFoundException('template not found');

    const slug = dto.slug ?? slugId();
    if (await this.prisma.form.findUnique({ where: { slug } })) {
      throw new ConflictException('slug already in use');
    }
    return this.prisma.form.create({
      data: { campaignId: dto.campaignId, templateId: dto.templateId, name: dto.name, slug },
    });
  }

  list(operatorId: string, campaignId?: string) {
    return this.prisma.form.findMany({
      where: { campaign: { operatorId }, ...(campaignId ? { campaignId } : {}) },
      orderBy: { createdAt: 'desc' },
      include: {
        campaign: { select: { id: true, name: true } },
        template: { select: { id: true, name: true } },
        _count: { select: { links: true, submissions: true } },
      },
    });
  }

  async get(operatorId: string, id: string) {
    const f = await this.prisma.form.findFirst({
      where: { id, campaign: { operatorId } },
      include: {
        campaign: { select: { id: true, name: true } },
        template: { select: { id: true, name: true } },
        links: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!f) throw new NotFoundException('form not found');
    return f;
  }

  async update(operatorId: string, id: string, dto: UpdateFormDto) {
    await this.get(operatorId, id);
    return this.prisma.form.update({ where: { id }, data: dto });
  }

  async remove(operatorId: string, id: string) {
    await this.get(operatorId, id);
    await this.prisma.form.delete({ where: { id } });
  }
}
