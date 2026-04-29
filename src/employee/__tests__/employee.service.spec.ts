import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { EmployeeService } from '../employee.service';
import { EmployeeRepository } from '../employee.repository';
import { EmployeeEntity, EmployeeRole } from '../employee.entity';
import { CreateEmployeeRequestDto } from '../dto/create-employee.request.dto';

describe('EmployeeService', () => {
  let service: EmployeeService;
  let repository: EmployeeRepository;

  const mockEmployee: EmployeeEntity = {
    id: 'emp-123',
    name: 'John Doe',
    email: 'john@test.com',
    role: EmployeeRole.EMPLOYEE,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as EmployeeEntity;

  const mockEmployeeRepository = {
    findByEmail: jest.fn(),
    save: jest.fn(),
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeeService,
        {
          provide: EmployeeRepository,
          useValue: mockEmployeeRepository,
        },
      ],
    }).compile();

    service = module.get<EmployeeService>(EmployeeService);
    repository = module.get<EmployeeRepository>(EmployeeRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const dto: CreateEmployeeRequestDto = {
      name: 'John Doe',
      email: 'john@test.com',
      role: EmployeeRole.EMPLOYEE,
    };

    it('should create a new employee', async () => {
      mockEmployeeRepository.findByEmail.mockResolvedValue(null);
      mockEmployeeRepository.save.mockResolvedValue(mockEmployee);

      const result = await service.create(dto);

      expect(repository.findByEmail).toHaveBeenCalledWith(dto.email);
      expect(repository.save).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockEmployee);
    });

    it('should throw ConflictException if email already exists', async () => {
      mockEmployeeRepository.findByEmail.mockResolvedValue(mockEmployee);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      await expect(service.create(dto)).rejects.toThrow(
        `Employee with email ${dto.email} already exists`,
      );
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return an employee when found', async () => {
      mockEmployeeRepository.findById.mockResolvedValue(mockEmployee);

      const result = await service.findById('emp-123');

      expect(repository.findById).toHaveBeenCalledWith('emp-123');
      expect(result).toEqual(mockEmployee);
    });

    it('should throw NotFoundException when employee not found', async () => {
      mockEmployeeRepository.findById.mockResolvedValue(null);

      await expect(service.findById('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findById('invalid-id')).rejects.toThrow(
        'Employee invalid-id not found',
      );
    });
  });
});
