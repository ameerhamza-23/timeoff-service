import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TimeOffRepository } from '../timeoff.repository';
import { TimeOffRequestEntity, TimeOffStatus } from '../timeoff-request.entity';

describe('TimeOffRepository', () => {
  let repository: TimeOffRepository;
  let typeormRepository: Repository<TimeOffRequestEntity>;

  const mockRequest: TimeOffRequestEntity = {
    id: 'req-123',
    employeeId: 'emp-123',
    locationId: 'loc1',
    startDate: '2026-05-01',
    endDate: '2026-05-03',
    days: 2,
    status: TimeOffStatus.PENDING,
    idempotencyKey: 'key-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as TimeOffRequestEntity;

  const mockTypeormRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimeOffRepository,
        {
          provide: getRepositoryToken(TimeOffRequestEntity),
          useValue: mockTypeormRepository,
        },
      ],
    }).compile();

    repository = module.get<TimeOffRepository>(TimeOffRepository);
    typeormRepository = module.get<Repository<TimeOffRequestEntity>>(
      getRepositoryToken(TimeOffRequestEntity),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should find a request by ID', async () => {
      mockTypeormRepository.findOne.mockResolvedValue(mockRequest);

      const result = await repository.findById('req-123');

      expect(typeormRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'req-123' },
      });
      expect(result).toEqual(mockRequest);
    });

    it('should return null when request not found', async () => {
      mockTypeormRepository.findOne.mockResolvedValue(null);

      const result = await repository.findById('invalid-id');

      expect(result).toBeNull();
    });
  });

  describe('findByEmployeeId', () => {
    it('should find all requests for an employee', async () => {
      const requests = [mockRequest, mockRequest];
      mockTypeormRepository.find.mockResolvedValue(requests);

      const result = await repository.findByEmployeeId('emp-123');

      expect(typeormRepository.find).toHaveBeenCalledWith({
        where: { employeeId: 'emp-123' },
      });
      expect(result).toEqual(requests);
    });

    it('should return empty array when no requests found', async () => {
      mockTypeormRepository.find.mockResolvedValue([]);

      const result = await repository.findByEmployeeId('emp-999');

      expect(result).toEqual([]);
    });
  });

  describe('findByIdempotencyKey', () => {
    it('should find a request by idempotency key', async () => {
      mockTypeormRepository.findOne.mockResolvedValue(mockRequest);

      const result = await repository.findByIdempotencyKey('key-123');

      expect(typeormRepository.findOne).toHaveBeenCalledWith({
        where: { idempotencyKey: 'key-123' },
      });
      expect(result).toEqual(mockRequest);
    });

    it('should return null when key not found', async () => {
      mockTypeormRepository.findOne.mockResolvedValue(null);

      const result = await repository.findByIdempotencyKey('invalid-key');

      expect(result).toBeNull();
    });
  });

  describe('save', () => {
    it('should create and save a time-off request', async () => {
      const requestData = {
        employeeId: 'emp-123',
        locationId: 'loc1',
        startDate: '2026-05-01',
        endDate: '2026-05-03',
        days: 2,
        status: TimeOffStatus.PENDING,
        idempotencyKey: 'key-123',
      };

      mockTypeormRepository.create.mockReturnValue(mockRequest);
      mockTypeormRepository.save.mockResolvedValue(mockRequest);

      const result = await repository.save(requestData);

      expect(typeormRepository.create).toHaveBeenCalledWith(requestData);
      expect(typeormRepository.save).toHaveBeenCalledWith(mockRequest);
      expect(result).toEqual(mockRequest);
    });
  });

  describe('updateStatus', () => {
    it('should update request status', async () => {
      mockTypeormRepository.update.mockResolvedValue({ affected: 1 });

      await repository.updateStatus('req-123', TimeOffStatus.APPROVED);

      expect(typeormRepository.update).toHaveBeenCalledWith('req-123', {
        status: TimeOffStatus.APPROVED,
      });
    });
  });
});
