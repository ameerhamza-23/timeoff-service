import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EmployeeRepository } from './employee.repository';
import { EmployeeEntity } from './employee.entity';
import { CreateEmployeeRequestDto } from './dto/create-employee.request.dto';

@Injectable()
export class EmployeeService {
  constructor(private readonly employeeRepository: EmployeeRepository) {}

  async create(dto: CreateEmployeeRequestDto): Promise<EmployeeEntity> {
    const existing = await this.employeeRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException(
        `Employee with email ${dto.email} already exists`,
      );
    }
    return this.employeeRepository.save(dto);
  }

  async findById(id: string): Promise<EmployeeEntity> {
    const employee = await this.employeeRepository.findById(id);
    if (!employee) {
      throw new NotFoundException(`Employee ${id} not found`);
    }
    return employee;
  }
}
