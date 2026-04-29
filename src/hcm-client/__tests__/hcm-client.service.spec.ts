import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import { HcmClientService } from '../hcm-client.service';

describe('HcmClientService', () => {
  let service: HcmClientService;
  let httpService: HttpService;

  const mockHttpService = {
    get: jest.fn(),
    post: jest.fn(),
  };

  beforeEach(async () => {
    process.env.HCM_BASE_URL = 'http://localhost:4000';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HcmClientService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    service = module.get<HcmClientService>(HcmClientService);
    httpService = module.get<HttpService>(HttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getBalance', () => {
    it('should get balance from HCM', async () => {
      const mockResponse: AxiosResponse = {
        data: {
          employeeId: 'emp-123',
          locationId: 'loc1',
          availableDays: 10,
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await service.getBalance('emp-123', 'loc1');

      expect(httpService.get).toHaveBeenCalledWith(
        'http://localhost:4000/hcm/balance/emp-123/loc1',
      );
      expect(result).toEqual({
        employeeId: 'emp-123',
        locationId: 'loc1',
        availableDays: 10,
      });
    });

    it('should return null on error', async () => {
      mockHttpService.get.mockReturnValue(
        throwError(() => ({ response: { status: 500 } })),
      );

      const result = await service.getBalance('emp-123', 'loc1');

      expect(result).toBeNull();
    });
  });

  describe('deduct', () => {
    it('should deduct days from HCM', async () => {
      const mockResponse: AxiosResponse = {
        data: {
          success: true,
          remainingDays: 8,
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const result = await service.deduct('emp-123', 'loc1', 2);

      expect(httpService.post).toHaveBeenCalledWith(
        'http://localhost:4000/hcm/deduct',
        {
          employeeId: 'emp-123',
          locationId: 'loc1',
          days: 2,
        },
      );
      expect(result).toEqual({
        success: true,
        remainingDays: 8,
      });
    });

    it('should handle deduction failure', async () => {
      const mockResponse: AxiosResponse = {
        data: {
          success: false,
          error: 'Insufficient balance',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const result = await service.deduct('emp-123', 'loc1', 20);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient balance');
    });
  });

  describe('rollback', () => {
    it('should rollback deduction in HCM', async () => {
      const mockResponse: AxiosResponse = {
        data: {
          ok: true,
          availableDays: 10,
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      await service.rollback('emp-123', 'loc1', 2);

      expect(httpService.post).toHaveBeenCalledWith(
        'http://localhost:4000/hcm/rollback',
        {
          employeeId: 'emp-123',
          locationId: 'loc1',
          days: 2,
        },
      );
    });

    it('should handle rollback errors gracefully', async () => {
      mockHttpService.post.mockReturnValue(
        throwError(() => new Error('Network error')),
      );

      // Should not throw, just log error
      await expect(service.rollback('emp-123', 'loc1', 2)).resolves.not.toThrow();
    });
  });

  describe('getBatchBalances', () => {
    it('should get all balances from HCM', async () => {
      const mockResponse: AxiosResponse = {
        data: [
          { employeeId: 'emp-1', locationId: 'loc1', availableDays: 10 },
          { employeeId: 'emp-2', locationId: 'loc1', availableDays: 15 },
        ],
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await service.getBatchBalances();

      expect(httpService.get).toHaveBeenCalledWith(
        'http://localhost:4000/hcm/balances',
      );
      expect(result).toHaveLength(2);
      expect(result[0].employeeId).toBe('emp-1');
    });

    it('should return empty array on error', async () => {
      mockHttpService.get.mockReturnValue(
        throwError(() => new Error('Network error')),
      );

      const result = await service.getBatchBalances();

      expect(result).toEqual([]);
    });
  });
});
