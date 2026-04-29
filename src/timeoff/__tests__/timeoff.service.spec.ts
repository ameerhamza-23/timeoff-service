import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { TimeOffService } from '../timeoff.service';
import { TimeOffRepository } from '../timeoff.repository';
import { BalanceService } from '../../balance/balance.service';
import { EmployeeService } from '../../employee/employee.service';
import { HcmClientService } from '../../hcm-client/hcm-client.service';
import { TimeOffRequestEntity } from '../timeoff-request.entity';
import { EmployeeEntity } from '../../employee/employee.entity';
import { TimeOffStatus } from '@libs/enums';

const mockRequest = (
  overrides: Partial<TimeOffRequestEntity> = {},
): TimeOffRequestEntity =>
  ({
    id: 'req1',
    employeeId: 'emp1',
    locationId: 'loc1',
    startDate: '2026-05-01',
    endDate: '2026-05-03',
    days: 2,
    status: TimeOffStatus.PENDING,
    idempotencyKey: 'key-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    toDto: jest.fn(),
    ...overrides,
  }) as unknown as TimeOffRequestEntity;

const mockEmployee = (): EmployeeEntity =>
  ({ id: 'emp1', name: 'John', email: 'john@test.com' }) as EmployeeEntity;

describe('TimeOffService', () => {
  let service: TimeOffService;
  let timeOffRepo: jest.Mocked<TimeOffRepository>;
  let balanceService: jest.Mocked<BalanceService>;
  let employeeService: jest.Mocked<EmployeeService>;
  let hcmClientService: jest.Mocked<HcmClientService>;

  beforeEach(() => {
    timeOffRepo = {
      findById: jest.fn(),
      findByEmployeeId: jest.fn(),
      findByIdempotencyKey: jest.fn(),
      save: jest.fn(),
      updateStatus: jest.fn(),
    } as unknown as jest.Mocked<TimeOffRepository>;

    balanceService = {
      hasEnoughBalance: jest.fn(),
      deduct: jest.fn(),
      restore: jest.fn(),
      syncFromHcm: jest.fn(),
      getBalance: jest.fn(),
    } as unknown as jest.Mocked<BalanceService>;

    employeeService = {
      findById: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<EmployeeService>;

    hcmClientService = {
      getBalance: jest.fn(),
      deduct: jest.fn(),
      rollback: jest.fn(),
      getBatchBalances: jest.fn(),
    } as unknown as jest.Mocked<HcmClientService>;

    service = new TimeOffService(
      timeOffRepo,
      balanceService,
      employeeService,
      hcmClientService,
    );
  });

  describe('create', () => {
    it('creates a new time-off request', async () => {
      timeOffRepo.findByIdempotencyKey.mockResolvedValue(null);
      employeeService.findById.mockResolvedValue(mockEmployee());
      timeOffRepo.save.mockResolvedValue(mockRequest());

      const result = await service.create({
        employeeId: 'emp1',
        locationId: 'loc1',
        startDate: '2026-05-01',
        endDate: '2026-05-03',
        days: 2,
        idempotencyKey: 'key-1',
      });

      expect(result.status).toBe(TimeOffStatus.PENDING);
      expect(timeOffRepo.save).toHaveBeenCalled();
    });

    it('returns existing request on duplicate idempotency key', async () => {
      const existing = mockRequest();
      timeOffRepo.findByIdempotencyKey.mockResolvedValue(existing);

      const result = await service.create({
        employeeId: 'emp1',
        locationId: 'loc1',
        startDate: '2026-05-01',
        endDate: '2026-05-03',
        days: 2,
        idempotencyKey: 'key-1',
      });

      expect(result).toBe(existing);
      expect(timeOffRepo.save).not.toHaveBeenCalled();
      expect(employeeService.findById).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when employee does not exist', async () => {
      timeOffRepo.findByIdempotencyKey.mockResolvedValue(null);
      employeeService.findById.mockRejectedValue(
        new NotFoundException('Employee not found'),
      );

      await expect(
        service.create({
          employeeId: 'ghost',
          locationId: 'loc1',
          startDate: '2026-05-01',
          endDate: '2026-05-03',
          days: 2,
          idempotencyKey: 'key-2',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('approve', () => {
    const setupApprove = () => {
      timeOffRepo.findById.mockResolvedValue(mockRequest());
      balanceService.hasEnoughBalance.mockResolvedValue(true);
      hcmClientService.getBalance.mockResolvedValue({
        employeeId: 'emp1',
        locationId: 'loc1',
        availableDays: 10,
      });
      hcmClientService.deduct.mockResolvedValue({ success: true });
      balanceService.deduct.mockResolvedValue({} as any);
      timeOffRepo.updateStatus.mockResolvedValue(undefined);
      timeOffRepo.findById.mockResolvedValueOnce(mockRequest()).mockResolvedValueOnce(
        mockRequest({ status: TimeOffStatus.APPROVED }),
      );
    };

    it('approves a valid pending request', async () => {
      setupApprove();

      const result = await service.approve('req1');

      expect(hcmClientService.deduct).toHaveBeenCalledWith('emp1', 'loc1', 2);
      expect(balanceService.deduct).toHaveBeenCalledWith('emp1', 'loc1', 2);
      expect(timeOffRepo.updateStatus).toHaveBeenCalledWith(
        'req1',
        TimeOffStatus.APPROVED,
      );
      expect(result.status).toBe(TimeOffStatus.APPROVED);
    });

    it('throws BadRequestException when local balance is insufficient', async () => {
      timeOffRepo.findById.mockResolvedValue(mockRequest());
      balanceService.hasEnoughBalance.mockResolvedValue(false);

      await expect(service.approve('req1')).rejects.toThrow(
        BadRequestException,
      );
      expect(hcmClientService.deduct).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when HCM balance is insufficient', async () => {
      timeOffRepo.findById.mockResolvedValue(mockRequest());
      balanceService.hasEnoughBalance.mockResolvedValue(true);
      hcmClientService.getBalance.mockResolvedValue({
        employeeId: 'emp1',
        locationId: 'loc1',
        availableDays: 1,
      });

      await expect(service.approve('req1')).rejects.toThrow(
        BadRequestException,
      );
      expect(hcmClientService.deduct).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when HCM is unreachable', async () => {
      timeOffRepo.findById.mockResolvedValue(mockRequest());
      balanceService.hasEnoughBalance.mockResolvedValue(true);
      hcmClientService.getBalance.mockResolvedValue(null);

      await expect(service.approve('req1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when HCM deduct fails', async () => {
      timeOffRepo.findById.mockResolvedValue(mockRequest());
      balanceService.hasEnoughBalance.mockResolvedValue(true);
      hcmClientService.getBalance.mockResolvedValue({
        employeeId: 'emp1',
        locationId: 'loc1',
        availableDays: 10,
      });
      hcmClientService.deduct.mockResolvedValue({
        success: false,
        error: 'Insufficient balance',
      });

      await expect(service.approve('req1')).rejects.toThrow(
        BadRequestException,
      );
      expect(balanceService.deduct).not.toHaveBeenCalled();
    });

    it('rolls back HCM when local deduction fails', async () => {
      timeOffRepo.findById.mockResolvedValue(mockRequest());
      balanceService.hasEnoughBalance.mockResolvedValue(true);
      hcmClientService.getBalance.mockResolvedValue({
        employeeId: 'emp1',
        locationId: 'loc1',
        availableDays: 10,
      });
      hcmClientService.deduct.mockResolvedValue({ success: true });
      balanceService.deduct.mockRejectedValue(new Error('DB error'));
      hcmClientService.rollback.mockResolvedValue(undefined);

      await expect(service.approve('req1')).rejects.toThrow(
        BadRequestException,
      );
      expect(hcmClientService.rollback).toHaveBeenCalledWith('emp1', 'loc1', 2);
    });

    it('throws ConflictException when request is not PENDING', async () => {
      timeOffRepo.findById.mockResolvedValue(
        mockRequest({ status: TimeOffStatus.APPROVED }),
      );

      await expect(service.approve('req1')).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException when request does not exist', async () => {
      timeOffRepo.findById.mockResolvedValue(null);

      await expect(service.approve('req1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('reject', () => {
    it('rejects a pending request', async () => {
      timeOffRepo.findById
        .mockResolvedValueOnce(mockRequest())
        .mockResolvedValueOnce(mockRequest({ status: TimeOffStatus.REJECTED }));
      timeOffRepo.updateStatus.mockResolvedValue(undefined);

      const result = await service.reject('req1');

      expect(timeOffRepo.updateStatus).toHaveBeenCalledWith(
        'req1',
        TimeOffStatus.REJECTED,
      );
      expect(result.status).toBe(TimeOffStatus.REJECTED);
    });

    it('throws ConflictException when request is already approved', async () => {
      timeOffRepo.findById.mockResolvedValue(
        mockRequest({ status: TimeOffStatus.APPROVED }),
      );

      await expect(service.reject('req1')).rejects.toThrow(ConflictException);
    });
  });

  describe('cancel', () => {
    it('cancels a pending request', async () => {
      timeOffRepo.findById
        .mockResolvedValueOnce(mockRequest())
        .mockResolvedValueOnce(
          mockRequest({ status: TimeOffStatus.CANCELLED }),
        );
      timeOffRepo.updateStatus.mockResolvedValue(undefined);

      const result = await service.cancel('req1');

      expect(timeOffRepo.updateStatus).toHaveBeenCalledWith(
        'req1',
        TimeOffStatus.CANCELLED,
      );
      expect(result.status).toBe(TimeOffStatus.CANCELLED);
    });

    it('throws ConflictException when request is already rejected', async () => {
      timeOffRepo.findById.mockResolvedValue(
        mockRequest({ status: TimeOffStatus.REJECTED }),
      );

      await expect(service.cancel('req1')).rejects.toThrow(ConflictException);
    });
  });
});
