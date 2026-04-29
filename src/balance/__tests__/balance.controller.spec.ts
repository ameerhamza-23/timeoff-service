import { Test, TestingModule } from '@nestjs/testing';
import { BalanceController } from '../balance.controller';
import { BalanceService } from '../balance.service';
import { BalanceEntity } from '../balance.entity';

describe('BalanceController', () => {
  let controller: BalanceController;
  let service: BalanceService;

  const mockBalanceEntity = {
    employeeId: 'emp-123',
    locationId: 'loc1',
    availableDays: 10,
    usedDays: 2,
    version: 1,
    hcmSyncedAt: new Date(),
    updatedAt: new Date(),
    toDto: jest.fn().mockReturnValue({
      employeeId: 'emp-123',
      locationId: 'loc1',
      availableDays: 10,
      usedDays: 2,
    }),
  } as unknown as BalanceEntity;

  const mockBalanceService = {
    getBalance: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BalanceController],
      providers: [
        {
          provide: BalanceService,
          useValue: mockBalanceService,
        },
      ],
    }).compile();

    controller = module.get<BalanceController>(BalanceController);
    service = module.get<BalanceService>(BalanceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getBalance', () => {
    it('should get balance for employee and location', async () => {
      mockBalanceService.getBalance.mockResolvedValue(mockBalanceEntity);

      const result = await controller.getBalance('emp-123', 'loc1');

      expect(service.getBalance).toHaveBeenCalledWith('emp-123', 'loc1');
      expect(mockBalanceEntity.toDto).toHaveBeenCalled();
      expect(result).toEqual({
        employeeId: 'emp-123',
        locationId: 'loc1',
        availableDays: 10,
        usedDays: 2,
      });
    });

    it('should propagate service errors', async () => {
      mockBalanceService.getBalance.mockRejectedValue(
        new Error('Balance not found'),
      );

      await expect(controller.getBalance('emp-123', 'loc1')).rejects.toThrow(
        'Balance not found',
      );
    });
  });
});
