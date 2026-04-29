import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BalanceRepository } from '../balance.repository';
import { BalanceEntity } from '../balance.entity';

describe('BalanceRepository', () => {
  let repository: BalanceRepository;
  let typeormRepository: Repository<BalanceEntity>;

  const mockBalance: BalanceEntity = {
    employeeId: 'emp-123',
    locationId: 'loc1',
    availableDays: 10,
    usedDays: 2,
    version: 1,
    hcmSyncedAt: new Date(),
    updatedAt: new Date(),
  } as BalanceEntity;

  const mockTypeormRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    upsert: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BalanceRepository,
        {
          provide: getRepositoryToken(BalanceEntity),
          useValue: mockTypeormRepository,
        },
      ],
    }).compile();

    repository = module.get<BalanceRepository>(BalanceRepository);
    typeormRepository = module.get<Repository<BalanceEntity>>(
      getRepositoryToken(BalanceEntity),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findOne', () => {
    it('should find balance by employee and location', async () => {
      mockTypeormRepository.findOne.mockResolvedValue(mockBalance);

      const result = await repository.findOne('emp-123', 'loc1');

      expect(typeormRepository.findOne).toHaveBeenCalledWith({
        where: { employeeId: 'emp-123', locationId: 'loc1' },
      });
      expect(result).toEqual(mockBalance);
    });

    it('should return null when balance not found', async () => {
      mockTypeormRepository.findOne.mockResolvedValue(null);

      const result = await repository.findOne('emp-999', 'loc1');

      expect(result).toBeNull();
    });
  });

  describe('findAllByEmployee', () => {
    it('should find all balances for an employee', async () => {
      const balances = [mockBalance, mockBalance];
      mockTypeormRepository.find.mockResolvedValue(balances);

      const result = await repository.findAllByEmployee('emp-123');

      expect(typeormRepository.find).toHaveBeenCalledWith({
        where: { employeeId: 'emp-123' },
      });
      expect(result).toEqual(balances);
    });
  });

  describe('save', () => {
    it('should save balance data', async () => {
      const balanceData = {
        employeeId: 'emp-123',
        locationId: 'loc1',
        availableDays: 15,
      };

      mockTypeormRepository.save.mockResolvedValue(mockBalance);

      const result = await repository.save(balanceData);

      expect(typeormRepository.save).toHaveBeenCalledWith(balanceData);
      expect(result).toEqual(mockBalance);
    });
  });

  describe('upsert', () => {
    it('should upsert balance data', async () => {
      const hcmSyncedAt = new Date();
      mockTypeormRepository.upsert.mockResolvedValue({ affected: 1 });

      await repository.upsert('emp-123', 'loc1', 15, hcmSyncedAt);

      expect(typeormRepository.upsert).toHaveBeenCalledWith(
        {
          employeeId: 'emp-123',
          locationId: 'loc1',
          availableDays: 15,
          hcmSyncedAt,
        },
        {
          conflictPaths: ['employeeId', 'locationId'],
          skipUpdateIfNoValuesChanged: true,
        },
      );
    });
  });
});
