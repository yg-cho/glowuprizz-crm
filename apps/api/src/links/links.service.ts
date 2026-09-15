import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { customAlphabet } from 'nanoid';
import { LINK_CODE_ALPHABET, LINK_CODE_LENGTH } from '@glowuprizz/shared';
import { PrismaService } from '../prisma/prisma.service';
import { OwnershipService } from '../common/ownership.service';
import { CreateLinkDto } from './dto/create-link.dto';

const linkCode = customAlphabet(LINK_CODE_ALPHABET, LINK_CODE_LENGTH);

@Injectable()
export class LinksService {
  private readonly publicBase: string;

  constructor(private readonly prisma: PrismaService, private readonly own: OwnershipService, config: ConfigService) {
    this.publicBase = config.get<string>('FORMS_PUBLIC_ORIGIN', 'http://localhost:3002').replace(/\/$/, '');
  }

  /** 공개 URL 은 저장하지 않고 응답 시점에 만든다 (origin 변경에 대응) */
  withUrl<T extends { code: string }>(link: T) {
    return { ...link, url: `${this.publicBase}/l/${link.code}` };
  }

  async create(operatorId: string, dto: CreateLinkDto) {
    await this.own.form(operatorId, dto.formId);
    const link = await this.prisma.distributionLink.create({ data: { formId: dto.formId, channel: dto.channel, code: linkCode() } });
    return this.withUrl(link);
  }

  async listByForm(operatorId: string, formId: string) {
    await this.own.form(operatorId, formId);
    const links = await this.prisma.distributionLink.findMany({ where: { formId }, orderBy: { createdAt: 'asc' } });
    return links.map((l) => this.withUrl(l));
  }

  async remove(operatorId: string, id: string) {
    await this.own.link(operatorId, id);
    await this.prisma.distributionLink.delete({ where: { id } });
  }
}
