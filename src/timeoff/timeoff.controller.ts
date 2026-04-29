import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { TimeOffService } from './timeoff.service';
import { CreateTimeOffRequestDto } from './dto/create-timeoff.request.dto';
import { TimeOffRequest } from '@libs/interfaces';

@Controller('timeoff')
export class TimeOffController {
  constructor(private readonly timeOffService: TimeOffService) {}

  @Post('request')
  async create(
    @Body() dto: CreateTimeOffRequestDto,
  ): Promise<TimeOffRequest> {
    const request = await this.timeOffService.create(dto);
    return request.toDto();
  }

  @Post(':id/approve')
  async approve(@Param('id') id: string): Promise<TimeOffRequest> {
    const request = await this.timeOffService.approve(id);
    return request.toDto();
  }

  @Post(':id/reject')
  async reject(@Param('id') id: string): Promise<TimeOffRequest> {
    const request = await this.timeOffService.reject(id);
    return request.toDto();
  }

  @Post(':id/cancel')
  async cancel(@Param('id') id: string): Promise<TimeOffRequest> {
    const request = await this.timeOffService.cancel(id);
    return request.toDto();
  }

  @Get('employee/:employeeId')
  async findByEmployee(
    @Param('employeeId') employeeId: string,
  ): Promise<TimeOffRequest[]> {
    const requests = await this.timeOffService.findByEmployee(employeeId);
    return requests.map((r) => r.toDto());
  }
}
