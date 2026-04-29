import { EmployeeRole } from '@libs/enums';

export class CreateEmployeeResponseDto {
  id: string;
  name: string;
  email: string;
  role: EmployeeRole;
}
