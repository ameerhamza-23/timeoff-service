import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeeEntity } from '../employee/employee.entity';
import { BalanceEntity } from '../balance/balance.entity';
import { TimeOffRequestEntity } from '../timeoff/timeoff-request.entity';
import { IdempotencyKeyEntity } from '@libs/idempotency/idempotency-key.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: process.env.DB_PATH ?? 'timeoff.db',
      entities: [
        EmployeeEntity,
        BalanceEntity,
        TimeOffRequestEntity,
        IdempotencyKeyEntity,
      ],
      synchronize: true,
      logging: process.env.NODE_ENV !== 'test',
    }),
  ],
})
export class DatabaseModule {}
