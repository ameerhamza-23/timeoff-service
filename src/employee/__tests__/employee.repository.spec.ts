import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmployeeRepository } from '../employee.repository';
import { EmployeeEntity, EmployeeRole } from '../employee.entity';

describe('EmployeeRepository', () => {
  let repository: EmployeeRepository;
  let typeormRepository: Repository<EmployeeEntity>;

  const mockEmployee: EmployeeEntity = {
    id: 'emp-123',
    name: 'John Doe',
    email: 'john@test.com',
    role: EmployeeRole.EMPLOYEE,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as EmployeeEntity;

  const mockTypeormRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeeRepository,
        {
          provide: getRepositoryToken(EmployeeEntity),
          useValue: mockTypeormRepository,
        },
      ],
    }).compile();

    repository = module.get<EmployeeRepository>(EmployeeRepository);
    typeormRepository = module.get<Repository<EmployeeEntity>>(
      getRepositoryToken(EmployeeEntity),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should find an employee by ID', async () => {
      mockTypeormRepository.findOne.mockResolvedValue(mockEmployee);

      const result = await repository.findById('emp-123');

      expect(typeormRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'emp-123' },
      });
      expect(result).toEqual(mockEmployee);
    });

    it('should return null when employee not found', async () => {
      mockTypeormRepository.findOne.mockResolvedValue(null);

      const result = await repository.findById('invalid-id');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should find an employee by email', async () => {
      mockTypeormRepository.findOne.mockResolvedValue(mockEmployee);

      const result = await repository.findByEmail('john@test.com');

      expect(typeormRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'john@test.com' },
      });
      expect(result).toEqual(mockEmployee);
    });

    it('should return null when email not found', async () => {
      mockTypeormRepository.findOne.mockResolvedValue(null);

      const result = await repository.findByEmail('notfound@test.com');

      expect(result).toBeNull();
    });
  });

  describe('save', () => {
    it('should create and save an employee entity', async () => {
      const employeeData = {
        name: 'John Doe',
        email: 'john@test.com',
        role: EmployeeRole.EMPLOYEE,
      };

      mockTypeormRepository.create.mockReturnValue(mockEmployee);
      mockTypeormRepository.save.mockResolvedValue(mockEmployee);

      const result = await repository.save(employeeData);

      expect(typeormRepository.create).toHaveBeenCalledWith(employeeData);
      expect(typeormRepository.save).toHaveBeenCalledWith(mockEmployee);
      expect(result).toEqual(mockEmployee);
    });
  });
});
