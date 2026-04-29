import { SyncService } from '../sync.service';
import { HcmClientService } from '../../hcm-client/hcm-client.service';
import { BalanceService } from '../../balance/balance.service';

describe('SyncService', () => {
  let service: SyncService;
  let hcmClientService: jest.Mocked<HcmClientService>;
  let balanceService: jest.Mocked<BalanceService>;

  beforeEach(() => {
    hcmClientService = {
      getBatchBalances: jest.fn(),
      getBalance: jest.fn(),
      deduct: jest.fn(),
      rollback: jest.fn(),
    } as unknown as jest.Mocked<HcmClientService>;

    balanceService = {
      syncFromHcm: jest.fn(),
      getBalance: jest.fn(),
      hasEnoughBalance: jest.fn(),
      deduct: jest.fn(),
      restore: jest.fn(),
    } as unknown as jest.Mocked<BalanceService>;

    service = new SyncService(hcmClientService, balanceService);
  });

  describe('sync', () => {
    it('syncs all entries from HCM batch', async () => {
      hcmClientService.getBatchBalances.mockResolvedValue([
        { employeeId: 'emp1', locationId: 'loc1', availableDays: 10 },
        { employeeId: 'emp2', locationId: 'loc1', availableDays: 5 },
      ]);
      balanceService.syncFromHcm.mockResolvedValue(undefined);

      const result = await service.sync();

      expect(result).toEqual({ synced: 2, failed: 0 });
      expect(balanceService.syncFromHcm).toHaveBeenCalledTimes(2);
      expect(balanceService.syncFromHcm).toHaveBeenCalledWith(
        'emp1',
        'loc1',
        10,
      );
      expect(balanceService.syncFromHcm).toHaveBeenCalledWith(
        'emp2',
        'loc1',
        5,
      );
    });

    it('returns 0 synced when HCM returns empty batch', async () => {
      hcmClientService.getBatchBalances.mockResolvedValue([]);

      const result = await service.sync();

      expect(result).toEqual({ synced: 0, failed: 0 });
      expect(balanceService.syncFromHcm).not.toHaveBeenCalled();
    });

    it('counts failed entries without aborting the sync', async () => {
      hcmClientService.getBatchBalances.mockResolvedValue([
        { employeeId: 'emp1', locationId: 'loc1', availableDays: 10 },
        { employeeId: 'emp2', locationId: 'loc1', availableDays: 5 },
        { employeeId: 'emp3', locationId: 'loc1', availableDays: 8 },
      ]);
      balanceService.syncFromHcm
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValueOnce(undefined);

      const result = await service.sync();

      expect(result).toEqual({ synced: 2, failed: 1 });
    });

    it('overwrites local balance with HCM value', async () => {
      hcmClientService.getBatchBalances.mockResolvedValue([
        { employeeId: 'emp1', locationId: 'loc1', availableDays: 20 },
      ]);
      balanceService.syncFromHcm.mockResolvedValue(undefined);

      await service.sync();

      expect(balanceService.syncFromHcm).toHaveBeenCalledWith(
        'emp1',
        'loc1',
        20,
      );
    });

    it('handles HCM batch fetch failure gracefully', async () => {
      hcmClientService.getBatchBalances.mockResolvedValue([]);

      const result = await service.sync();

      expect(result).toEqual({ synced: 0, failed: 0 });
    });
  });
});
