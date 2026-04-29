import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimeOffRequestEntity } from './timeoff-request.entity';
import { TimeOffRepository } from './timeoff.repository';
import { TimeOffService } from './timeoff.service';
import { TimeOffController } from './timeoff.controller';
import { BalanceModule } from '../balance/balance.module';
import { EmployeeModule } from '../employee/employee.module';
import { HcmClientModule } from '../hcm-client/hcm-client.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TimeOffRequestEntity]),
    BalanceModule,
    EmployeeModule,
    HcmClientModule,
  ],
  controllers: [TimeOffController],
  providers: [TimeOffService, TimeOffRepository],
})
export class TimeOffModule {}
