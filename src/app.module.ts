import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { BalanceModule } from './balance/balance.module';

@Module({
  imports: [DatabaseModule, BalanceModule],
})
export class AppModule {}
