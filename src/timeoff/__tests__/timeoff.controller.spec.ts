import { Test, TestingModule } from '@nestjs/testing';
import { TimeOffController } from '../timeoff.controller';
import { TimeOffService } from '../timeoff.service';
import { TimeOffRequestEntity, TimeOffStatus } from '../timeoff-request.entity';
import { CreateTimeOffRequestDto } from '../dto/create-timeoff.request.dto';

describe('TimeOffController', () => {
  let controller: TimeOffController;
  let service: TimeOffService;

  const mockTimeOffEntity = {
    id: 'req-123',
    employeeId: 'emp-123',
    locationId: 'loc1',
    startDate: '2026-05-01',
    endDate: '2026-05-03',
    days: 2,
    status: TimeOffStatus.PENDING,
    idempotencyKey: 'key-123',
    createdAt: new Date(),
    toDto: jest.fn().mockReturnValue({
      id: 'req-123',
      employeeId: 'emp-123',
      locationId: 'loc1',
      startDate: '2026-05-01',
      endDate: '2026-05-03',
      days: 2,
      status: TimeOffStatus.PENDING,
      createdAt: new Date(),
    }),
  } as unknown as TimeOffRequestEntity;

  const mockTimeOffService = {
    create: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
    cancel: jest.fn(),
    findByEmployee: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TimeOffController],
      providers: [
        {
          provide: TimeOffService,
          useValue: mockTimeOffService,
        },
      ],
    }).compile();

    controller = module.get<TimeOffController>(TimeOffController);
    service = module.get<TimeOffService>(TimeOffService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a time-off request', async () => {
      const dto: CreateTimeOffRequestDto = {
        employeeId: 'emp-123',
        locationId: 'loc1',
        startDate: '2026-05-01',
        endDate: '2026-05-03',
        days: 2,
        idempotencyKey: 'key-123',
      };

      mockTimeOffService.create.mockResolvedValue(mockTimeOffEntity);

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(mockTimeOffEntity.toDto).toHaveBeenCalled();
      expect(result.id).toBe('req-123');
      expect(result.status).toBe(TimeOffStatus.PENDING);
    });
  });

  describe('approve', () => {
    it('should approve a time-off request', async () => {
      const approvedEntity = {
        ...mockTimeOffEntity,
        status: TimeOffStatus.APPROVED,
        toDto: jest.fn().mockReturnValue({
          ...mockTimeOffEntity.toDto(),
          status: TimeOffStatus.APPROVED,
        }),
      } as unknown as TimeOffRequestEntity;

      mockTimeOffService.approve.mockResolvedValue(approvedEntity);

      const result = await controller.approve('req-123');

      expect(service.approve).toHaveBeenCalledWith('req-123');
      expect(result.status).toBe(TimeOffStatus.APPROVED);
    });
  });

  describe('reject', () => {
    it('should reject a time-off request', async () => {
      const rejectedEntity = {
        ...mockTimeOffEntity,
        status: TimeOffStatus.REJECTED,
        toDto: jest.fn().mockReturnValue({
          ...mockTimeOffEntity.toDto(),
          status: TimeOffStatus.REJECTED,
        }),
      } as unknown as TimeOffRequestEntity;

      mockTimeOffService.reject.mockResolvedValue(rejectedEntity);

      const result = await controller.reject('req-123');

      expect(service.reject).toHaveBeenCalledWith('req-123');
      expect(result.status).toBe(TimeOffStatus.REJECTED);
    });
  });

  describe('cancel', () => {
    it('should cancel a time-off request', async () => {
      const cancelledEntity = {
        ...mockTimeOffEntity,
        status: TimeOffStatus.CANCELLED,
        toDto: jest.fn().mockReturnValue({
          ...mockTimeOffEntity.toDto(),
          status: TimeOffStatus.CANCELLED,
        }),
      } as unknown as TimeOffRequestEntity;

      mockTimeOffService.cancel.mockResolvedValue(cancelledEntity);

      const result = await controller.cancel('req-123');

      expect(service.cancel).toHaveBeenCalledWith('req-123');
      expect(result.status).toBe(TimeOffStatus.CANCELLED);
    });
  });

  describe('findByEmployee', () => {
    it('should find all requests for an employee', async () => {
      const requests = [mockTimeOffEntity, mockTimeOffEntity];
      mockTimeOffService.findByEmployee.mockResolvedValue(requests);

      const result = await controller.findByEmployee('emp-123');

      expect(service.findByEmployee).toHaveBeenCalledWith('emp-123');
      expect(result).toHaveLength(2);
      expect(mockTimeOffEntity.toDto).toHaveBeenCalledTimes(2);
    });

    it('should return empty array when no requests found', async () => {
      mockTimeOffService.findByEmployee.mockResolvedValue([]);

      const result = await controller.findByEmployee('emp-999');

      expect(result).toEqual([]);
    });
  });
});
