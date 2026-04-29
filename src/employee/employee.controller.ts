import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { CreateEmployeeRequestDto } from './dto/create-employee.request.dto';
import { CreateEmployeeResponseDto } from './dto/create-employee.response.dto';
import { Employee } from '@libs/interfaces';

@Controller('employees')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post()
  async create(
    @Body() dto: CreateEmployeeRequestDto,
  ): Promise<CreateEmployeeResponseDto> {
    const employee = await this.employeeService.create(dto);
    return employee.toDto();
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<Employee> {
    const employee = await this.employeeService.findById(id);
    return employee.toDto();
  }
}
