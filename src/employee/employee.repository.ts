import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmployeeEntity } from './employee.entity';

@Injectable()
export class EmployeeRepository {
  constructor(
    @InjectRepository(EmployeeEntity)
    private readonly repo: Repository<EmployeeEntity>,
  ) {}

  findById(id: string): Promise<EmployeeEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByEmail(email: string): Promise<EmployeeEntity | null> {
    return this.repo.findOne({ where: { email } });
  }

  async save(employee: Partial<EmployeeEntity>): Promise<EmployeeEntity> {
    const entity = this.repo.create(employee);
    return this.repo.save(entity);
  }
}
