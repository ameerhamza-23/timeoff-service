import { IsEmail, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { EmployeeRole } from '@libs/enums';

export class CreateEmployeeRequestDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsEnum(EmployeeRole)
  role: EmployeeRole;
}
