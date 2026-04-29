import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HcmClientService } from '../hcm-client/hcm-client.service';
import { BalanceService } from '../balance/balance.service';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly hcmClientService: HcmClientService,
    private readonly balanceService: BalanceService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async scheduledSync(): Promise<void> {
    this.logger.log('Scheduled HCM sync started');
    await this.sync();
  }

  async sync(): Promise<{ synced: number; failed: number }> {
    const entries = await this.hcmClientService.getBatchBalances();

    if (entries.length === 0) {
      this.logger.warn('HCM batch returned 0 entries — skipping sync');
      return { synced: 0, failed: 0 };
    }

    let synced = 0;
    let failed = 0;

    for (const entry of entries) {
      try {
        await this.balanceService.syncFromHcm(
          entry.employeeId,
          entry.locationId,
          entry.availableDays,
        );
        synced++;
      } catch (error) {
        this.logger.error(
          `Failed to sync balance for ${entry.employeeId}@${entry.locationId}`,
          error,
        );
        failed++;
      }
    }

    this.logger.log(`HCM sync complete — synced: ${synced}, failed: ${failed}`);
    return { synced, failed };
  }
}
