import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { BalanceModule } from './balance/balance.module';
import { EmployeeModule } from './employee/employee.module';
import { HcmClientModule } from './hcm-client/hcm-client.module';
import { TimeOffModule } from './timeoff/timeoff.module';

@Module({
  imports: [
    DatabaseModule,
    EmployeeModule,
    BalanceModule,
    HcmClientModule,
    TimeOffModule,
  ],
})
export class AppModule {}
