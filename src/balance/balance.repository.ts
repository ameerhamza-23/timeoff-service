import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BalanceEntity } from './balance.entity';

@Injectable()
export class BalanceRepository {
  constructor(
    @InjectRepository(BalanceEntity)
    private readonly repo: Repository<BalanceEntity>,
  ) {}

  findOne(employeeId: string, locationId: string): Promise<BalanceEntity | null> {
    return this.repo.findOne({ where: { employeeId, locationId } });
  }

  findAllByEmployee(employeeId: string): Promise<BalanceEntity[]> {
    return this.repo.find({ where: { employeeId } });
  }

  save(balance: Partial<BalanceEntity>): Promise<BalanceEntity> {
    return this.repo.save(balance);
  }

  async upsert(employeeId: string, locationId: string, availableDays: number, hcmSyncedAt: Date): Promise<void> {
    await this.repo.upsert(
      { employeeId, locationId, availableDays, hcmSyncedAt },
      { conflictPaths: ['employeeId', 'locationId'], skipUpdateIfNoValuesChanged: true },
    );
  }
}
