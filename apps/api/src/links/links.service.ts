import { Injectable, NotFoundException } from '@nestjs/common';
import { customAlphabet } from 'nanoid';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLinkDto } from './dto/create-link.dto';

// 대소문자 혼동 문자(0/O, 1/l/I) 제외
const linkCode = customAlphabet('23456789abcdefghjkmnpqrstuvwxyz', 8);

@Injectable()
export class LinksService {
  constructor(private readonly prisma: PrismaService) {}

  private publicBase() {
    return (process.env.FORMS_PUBLIC_ORIGIN ?? 'http://localhost:3002').replace(/\/$/, '');
  }

  withUrl<T extends { code: string }>(link: T) {
    return { ...link, url: `${this.publicBase()}/l/${link.code}` };
  }

  async create(operatorId: string, dto: CreateLinkDto) {
    const form = await this.prisma.form.findFirst({ where: { id: dto.formId, campaign: { operatorId } } });
    if (!form) throw new NotFoundException('form not found');
    const link = await this.prisma.distributionLink.create({
      data: { formId: dto.formId, channel: dto.channel, code: linkCode() },
    });
    return this.withUrl(link);
  }

  async listByForm(operatorId: string, formId: string) {
    const form = await this.prisma.form.findFirst({ where: { id: formId, campaign: { operatorId } } });
    if (!form) throw new NotFoundException('form not found');
    const links = await this.prisma.distributionLink.findMany({ where: { formId }, orderBy: { createdAt: 'asc' } });
    return links.map((l) => this.withUrl(l));
  }

  async remove(operatorId: string, id: string) {
    const link = await this.prisma.distributionLink.findFirst({ where: { id, form: { campaign: { operatorId } } } });
    if (!link) throw new NotFoundException('link not found');
    await this.prisma.distributionLink.delete({ where: { id } });
  }
}
