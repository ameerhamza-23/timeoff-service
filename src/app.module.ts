import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { BalanceModule } from './balance/balance.module';
import { EmployeeModule } from './employee/employee.module';

@Module({
  imports: [DatabaseModule, EmployeeModule, BalanceModule],
})
export class AppModule {}
