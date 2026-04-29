import { Test, TestingModule } from '@nestjs/testing';
import { EmployeeController } from '../employee.controller';
import { EmployeeService } from '../employee.service';
import { EmployeeEntity } from '../employee.entity';
import { CreateEmployeeRequestDto } from '../dto/create-employee.request.dto';
import { EmployeeRole } from '@libs/enums';

describe('EmployeeController', () => {
  let controller: EmployeeController;
  let service: EmployeeService;

  const mockEmployeeEntity = {
    id: 'emp-123',
    name: 'John Doe',
    email: 'john@test.com',
    role: EmployeeRole.EMPLOYEE,
    createdAt: new Date(),
    updatedAt: new Date(),
    toDto: jest.fn().mockReturnValue({
      id: 'emp-123',
      name: 'John Doe',
      email: 'john@test.com',
      role: EmployeeRole.EMPLOYEE,
    }),
  } as unknown as EmployeeEntity;

  const mockEmployeeService = {
    create: jest.fn(),
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmployeeController],
      providers: [
        {
          provide: EmployeeService,
          useValue: mockEmployeeService,
        },
      ],
    }).compile();

    controller = module.get<EmployeeController>(EmployeeController);
    service = module.get<EmployeeService>(EmployeeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an employee and return DTO', async () => {
      const dto: CreateEmployeeRequestDto = {
        name: 'John Doe',
        email: 'john@test.com',
        role: EmployeeRole.EMPLOYEE,
      };

      mockEmployeeService.create.mockResolvedValue(mockEmployeeEntity);

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(mockEmployeeEntity.toDto).toHaveBeenCalled();
      expect(result).toEqual({
        id: 'emp-123',
        name: 'John Doe',
        email: 'john@test.com',
        role: EmployeeRole.EMPLOYEE,
      });
    });

    it('should propagate service errors', async () => {
      const dto: CreateEmployeeRequestDto = {
        name: 'John Doe',
        email: 'john@test.com',
        role: EmployeeRole.EMPLOYEE,
      };

      mockEmployeeService.create.mockRejectedValue(
        new Error('Email already exists'),
      );

      await expect(controller.create(dto)).rejects.toThrow(
        'Email already exists',
      );
    });
  });

  describe('findById', () => {
    it('should find an employee by ID and return DTO', async () => {
      mockEmployeeService.findById.mockResolvedValue(mockEmployeeEntity);

      const result = await controller.findById('emp-123');

      expect(service.findById).toHaveBeenCalledWith('emp-123');
      expect(mockEmployeeEntity.toDto).toHaveBeenCalled();
      expect(result).toEqual({
        id: 'emp-123',
        name: 'John Doe',
        email: 'john@test.com',
        role: EmployeeRole.EMPLOYEE,
      });
    });

    it('should propagate not found errors', async () => {
      mockEmployeeService.findById.mockRejectedValue(
        new Error('Employee not found'),
      );

      await expect(controller.findById('invalid-id')).rejects.toThrow(
        'Employee not found',
      );
    });
  });
});
