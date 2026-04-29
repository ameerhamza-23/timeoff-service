import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { TimeOffRepository } from './timeoff.repository';
import { TimeOffRequestEntity } from './timeoff-request.entity';
import { CreateTimeOffRequestDto } from './dto/create-timeoff.request.dto';
import { BalanceService } from '../balance/balance.service';
import { EmployeeService } from '../employee/employee.service';
import { HcmClientService } from '../hcm-client/hcm-client.service';
import { TimeOffStatus } from '@libs/enums';

@Injectable()
export class TimeOffService {
  private readonly logger = new Logger(TimeOffService.name);

  constructor(
    private readonly timeOffRepository: TimeOffRepository,
    private readonly balanceService: BalanceService,
    private readonly employeeService: EmployeeService,
    private readonly hcmClientService: HcmClientService,
  ) {}

  async create(
    dto: CreateTimeOffRequestDto,
  ): Promise<TimeOffRequestEntity> {
    // Idempotency check — return existing request if same key is resubmitted
    const existing = await this.timeOffRepository.findByIdempotencyKey(
      dto.idempotencyKey,
    );
    if (existing) return existing;

    // Validate employee exists
    await this.employeeService.findById(dto.employeeId);

    return this.timeOffRepository.save({
      ...dto,
      status: TimeOffStatus.PENDING,
    });
  }

  async approve(id: string): Promise<TimeOffRequestEntity> {
    const request = await this.findPendingById(id);

    // Step 1 — defensive local balance check
    const hasLocal = await this.balanceService.hasEnoughBalance(
      request.employeeId,
      request.locationId,
      request.days,
    );
    if (!hasLocal) {
      throw new BadRequestException(
        `Insufficient local balance for employee ${request.employeeId}`,
      );
    }

    // Step 2 — HCM source of truth check
    const hcmBalance = await this.hcmClientService.getBalance(
      request.employeeId,
      request.locationId,
    );
    if (!hcmBalance || hcmBalance.availableDays < request.days) {
      throw new BadRequestException(
        `Insufficient HCM balance for employee ${request.employeeId}`,
      );
    }

    // Step 3 — deduct from HCM
    const hcmResult = await this.hcmClientService.deduct(
      request.employeeId,
      request.locationId,
      request.days,
    );
    if (!hcmResult.success) {
      throw new BadRequestException(
        `HCM rejected deduction: ${hcmResult.error ?? 'unknown error'}`,
      );
    }

    // Step 4 — deduct locally; if this fails rollback HCM
    try {
      await this.balanceService.deduct(
        request.employeeId,
        request.locationId,
        request.days,
      );
    } catch (error) {
      this.logger.error(
        `Local deduction failed after HCM success — rolling back HCM`,
        error,
      );
      await this.hcmClientService.rollback(
        request.employeeId,
        request.locationId,
        request.days,
      );
      throw new BadRequestException('Approval failed due to internal error');
    }

    // Step 5 — mark approved
    await this.timeOffRepository.updateStatus(id, TimeOffStatus.APPROVED);
    return this.timeOffRepository.findById(id) as Promise<TimeOffRequestEntity>;
  }

  async reject(id: string): Promise<TimeOffRequestEntity> {
    await this.findPendingById(id);
    await this.timeOffRepository.updateStatus(id, TimeOffStatus.REJECTED);
    return this.timeOffRepository.findById(id) as Promise<TimeOffRequestEntity>;
  }

  async cancel(id: string): Promise<TimeOffRequestEntity> {
    await this.findPendingById(id);
    await this.timeOffRepository.updateStatus(id, TimeOffStatus.CANCELLED);
    return this.timeOffRepository.findById(id) as Promise<TimeOffRequestEntity>;
  }

  async findByEmployee(
    employeeId: string,
  ): Promise<TimeOffRequestEntity[]> {
    return this.timeOffRepository.findByEmployeeId(employeeId);
  }

  private async findPendingById(
    id: string,
  ): Promise<TimeOffRequestEntity> {
    const request = await this.timeOffRepository.findById(id);
    if (!request) {
      throw new NotFoundException(`Time-off request ${id} not found`);
    }
    if (request.status !== TimeOffStatus.PENDING) {
      throw new ConflictException(
        `Request is already ${request.status} — only PENDING requests can be actioned`,
      );
    }
    return request;
  }
}
