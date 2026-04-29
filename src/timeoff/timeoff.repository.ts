import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TimeOffRequestEntity } from './timeoff-request.entity';
import { TimeOffStatus } from '@libs/enums';

@Injectable()
export class TimeOffRepository {
  constructor(
    @InjectRepository(TimeOffRequestEntity)
    private readonly repo: Repository<TimeOffRequestEntity>,
  ) {}

  findById(id: string): Promise<TimeOffRequestEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByEmployeeId(employeeId: string): Promise<TimeOffRequestEntity[]> {
    return this.repo.find({ where: { employeeId } });
  }

  findByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<TimeOffRequestEntity | null> {
    return this.repo.findOne({ where: { idempotencyKey } });
  }

  save(
    request: Partial<TimeOffRequestEntity>,
  ): Promise<TimeOffRequestEntity> {
    return this.repo.save(request);
  }

  async updateStatus(
    id: string,
    status: TimeOffStatus,
  ): Promise<void> {
    await this.repo.update(id, { status });
  }
}
