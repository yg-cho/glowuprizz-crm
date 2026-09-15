import { Global, Module } from '@nestjs/common';
import { OwnershipService } from './ownership.service';
import { ConfigController } from './config.controller';

@Global()
@Module({ controllers: [ConfigController], providers: [OwnershipService], exports: [OwnershipService] })
export class CommonModule {}
