import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './database/database.module';
import { BalanceModule } from './balance/balance.module';
import { EmployeeModule } from './employee/employee.module';
import { HcmClientModule } from './hcm-client/hcm-client.module';
import { TimeOffModule } from './timeoff/timeoff.module';
import { SyncModule } from './sync/sync.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    DatabaseModule,
    EmployeeModule,
    BalanceModule,
    HcmClientModule,
    TimeOffModule,
    SyncModule,
  ],
})
export class AppModule {}
