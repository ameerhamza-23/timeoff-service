import { Controller, Get, Param } from '@nestjs/common';
import { BalanceService } from './balance.service';
import { BalanceEntity } from './balance.entity';
import { GetBalanceResponseDto } from './dto/get-balance.response.dto';

@Controller('balances')
export class BalanceController {
  constructor(private readonly balanceService: BalanceService) {}

  @Get(':employeeId/:locationId')
  async getBalance(
    @Param('employeeId') employeeId: string,
    @Param('locationId') locationId: string,
  ): Promise<GetBalanceResponseDto> {
    const balance: BalanceEntity = await this.balanceService.getBalance(
      employeeId,
      locationId,
    );
    return balance.toDto();
  }
}
