import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BalanceEntity } from './balance.entity';
import { BalanceRepository } from './balance.repository';
import { BalanceService } from './balance.service';
import { BalanceController } from './balance.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BalanceEntity])],
  controllers: [BalanceController],
  providers: [BalanceService, BalanceRepository],
  exports: [BalanceService],
})
export class BalanceModule {}
