import { Test, TestingModule } from '@nestjs/testing';
import { SyncController } from '../sync.controller';
import { SyncService } from '../sync.service';

describe('SyncController', () => {
  let controller: SyncController;
  let service: SyncService;

  const mockSyncService = {
    sync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SyncController],
      providers: [
        {
          provide: SyncService,
          useValue: mockSyncService,
        },
      ],
    }).compile();

    controller = module.get<SyncController>(SyncController);
    service = module.get<SyncService>(SyncService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('trigger', () => {
    it('should trigger sync and return result', async () => {
      const syncResult = { synced: 5, failed: 0 };
      mockSyncService.sync.mockResolvedValue(syncResult);

      const result = await controller.trigger();

      expect(service.sync).toHaveBeenCalled();
      expect(result).toEqual(syncResult);
    });

    it('should propagate service errors', async () => {
      mockSyncService.sync.mockRejectedValue(new Error('Sync failed'));

      await expect(controller.trigger()).rejects.toThrow('Sync failed');
    });
  });
});
