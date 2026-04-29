import { Controller, Post } from '@nestjs/common';
import { SyncService } from './sync.service';

@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('trigger')
  async trigger(): Promise<{ synced: number; failed: number }> {
    return this.syncService.sync();
  }
}
