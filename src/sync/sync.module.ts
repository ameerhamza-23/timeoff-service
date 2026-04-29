import { Module } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';
import { HcmClientModule } from '../hcm-client/hcm-client.module';
import { BalanceModule } from '../balance/balance.module';

@Module({
  imports: [HcmClientModule, BalanceModule],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
