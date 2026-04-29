import { Injectable, NotFoundException } from '@nestjs/common';
import { BalanceRepository } from './balance.repository';
import { BalanceEntity } from './balance.entity';

@Injectable()
export class BalanceService {
  constructor(private readonly balanceRepository: BalanceRepository) {}

  async getBalance(
    employeeId: string,
    locationId: string,
  ): Promise<BalanceEntity> {
    const balance = await this.balanceRepository.findOne(
      employeeId,
      locationId,
    );
    if (!balance) {
      throw new NotFoundException(
        `No balance found for employee ${employeeId} at location ${locationId}`,
      );
    }
    return balance;
  }

  async hasEnoughBalance(
    employeeId: string,
    locationId: string,
    days: number,
  ): Promise<boolean> {
    const balance = await this.balanceRepository.findOne(
      employeeId,
      locationId,
    );
    if (!balance) return false;
    return balance.availableDays >= days;
  }

  // Called on approval — optimistic lock via @VersionColumn handles concurrent writes
  async deduct(
    employeeId: string,
    locationId: string,
    days: number,
  ): Promise<BalanceEntity> {
    const balance = await this.balanceRepository.findOne(
      employeeId,
      locationId,
    );
    if (!balance) {
      throw new NotFoundException(
        `No balance found for employee ${employeeId} at location ${locationId}`,
      );
    }
    if (balance.availableDays < days) {
      throw new Error(
        `Insufficient balance: available ${balance.availableDays}, requested ${days}`,
      );
    }

    return this.balanceRepository.save({
      ...balance,
      availableDays: balance.availableDays - days,
      usedDays: balance.usedDays + days,
    });
  }

  // Called on rejection/cancellation — restore previously deducted days
  async restore(
    employeeId: string,
    locationId: string,
    days: number,
  ): Promise<BalanceEntity> {
    const balance = await this.balanceRepository.findOne(
      employeeId,
      locationId,
    );
    if (!balance) {
      throw new NotFoundException(
        `No balance found for employee ${employeeId} at location ${locationId}`,
      );
    }

    return this.balanceRepository.save({
      ...balance,
      availableDays: balance.availableDays + days,
      usedDays: Math.max(0, balance.usedDays - days),
    });
  }

  // Called during HCM batch sync — HCM is source of truth, full overwrite
  async syncFromHcm(
    employeeId: string,
    locationId: string,
    availableDays: number,
  ): Promise<void> {
    await this.balanceRepository.upsert(
      employeeId,
      locationId,
      availableDays,
      new Date(),
    );
  }
}
