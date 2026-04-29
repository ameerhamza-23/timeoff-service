import { NotFoundException } from '@nestjs/common';
import { BalanceService } from '../balance.service';
import { BalanceRepository } from '../balance.repository';
import { BalanceEntity } from '../balance.entity';

const mockBalance = (overrides: Partial<BalanceEntity> = {}): BalanceEntity =>
  ({
    employeeId: 'emp1',
    locationId: 'loc1',
    availableDays: 10,
    usedDays: 2,
    version: 1,
    hcmSyncedAt: null,
    updatedAt: new Date(),
    toDto: jest.fn(),
    ...overrides,
  }) as unknown as BalanceEntity;

describe('BalanceService', () => {
  let service: BalanceService;
  let repo: jest.Mocked<BalanceRepository>;

  beforeEach(() => {
    repo = {
      findOne: jest.fn(),
      findAllByEmployee: jest.fn(),
      save: jest.fn(),
      upsert: jest.fn(),
    } as unknown as jest.Mocked<BalanceRepository>;

    service = new BalanceService(repo);
  });

  describe('getBalance', () => {
    it('returns balance when found', async () => {
      const balance = mockBalance();
      repo.findOne.mockResolvedValue(balance);

      const result = await service.getBalance('emp1', 'loc1');

      expect(result).toBe(balance);
      expect(repo.findOne).toHaveBeenCalledWith('emp1', 'loc1');
    });

    it('throws NotFoundException when balance does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.getBalance('emp1', 'loc1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('hasEnoughBalance', () => {
    it('returns true when available days >= requested days', async () => {
      repo.findOne.mockResolvedValue(mockBalance({ availableDays: 10 }));

      const result = await service.hasEnoughBalance('emp1', 'loc1', 5);

      expect(result).toBe(true);
    });

    it('returns false when available days < requested days', async () => {
      repo.findOne.mockResolvedValue(mockBalance({ availableDays: 3 }));

      const result = await service.hasEnoughBalance('emp1', 'loc1', 5);

      expect(result).toBe(false);
    });

    it('returns false when balance does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.hasEnoughBalance('emp1', 'loc1', 5);

      expect(result).toBe(false);
    });
  });

  describe('deduct', () => {
    it('deducts days from available balance', async () => {
      const balance = mockBalance({ availableDays: 10, usedDays: 0 });
      repo.findOne.mockResolvedValue(balance);
      repo.save.mockResolvedValue(
        mockBalance({ availableDays: 8, usedDays: 2 }),
      );

      await service.deduct('emp1', 'loc1', 2);

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ availableDays: 8, usedDays: 2 }),
      );
    });

    it('throws when insufficient balance', async () => {
      repo.findOne.mockResolvedValue(mockBalance({ availableDays: 1 }));

      await expect(service.deduct('emp1', 'loc1', 5)).rejects.toThrow(
        'Insufficient balance',
      );
    });

    it('throws NotFoundException when balance does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.deduct('emp1', 'loc1', 2)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('restore', () => {
    it('restores days back to available balance', async () => {
      const balance = mockBalance({ availableDays: 8, usedDays: 2 });
      repo.findOne.mockResolvedValue(balance);
      repo.save.mockResolvedValue(
        mockBalance({ availableDays: 10, usedDays: 0 }),
      );

      await service.restore('emp1', 'loc1', 2);

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ availableDays: 10, usedDays: 0 }),
      );
    });

    it('does not allow usedDays to go below 0', async () => {
      const balance = mockBalance({ availableDays: 10, usedDays: 0 });
      repo.findOne.mockResolvedValue(balance);
      repo.save.mockResolvedValue(mockBalance());

      await service.restore('emp1', 'loc1', 5);

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ usedDays: 0 }),
      );
    });

    it('throws NotFoundException when balance does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.restore('emp1', 'loc1', 2)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('syncFromHcm', () => {
    it('calls upsert with correct values and current timestamp', async () => {
      repo.upsert.mockResolvedValue(undefined);

      await service.syncFromHcm('emp1', 'loc1', 15);

      expect(repo.upsert).toHaveBeenCalledWith(
        'emp1',
        'loc1',
        15,
        expect.any(Date),
      );
    });
  });
});
