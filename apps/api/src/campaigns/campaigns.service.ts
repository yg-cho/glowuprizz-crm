import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OwnershipService } from '../common/ownership.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService, private readonly own: OwnershipService) {}

  create(operatorId: string, dto: CreateCampaignDto) {
    return this.prisma.campaign.create({ data: { operatorId, ...dto } });
  }

  list(operatorId: string) {
    return this.prisma.campaign.findMany({
      where: { operatorId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { forms: true } } },
    });
  }

  async get(operatorId: string, id: string) {
    await this.own.campaign(operatorId, id);
    return this.prisma.campaign.findUniqueOrThrow({
      where: { id },
      include: { forms: { include: { template: { select: { id: true, name: true } }, _count: { select: { links: true, submissions: true } } } } },
    });
  }

  async remove(operatorId: string, id: string) {
    await this.own.campaign(operatorId, id);
    await this.prisma.campaign.delete({ where: { id } });
  }
}
