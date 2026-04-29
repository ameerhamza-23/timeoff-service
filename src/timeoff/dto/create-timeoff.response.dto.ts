import { TimeOffStatus } from '@libs/enums';

export class CreateTimeOffResponseDto {
  id: string;
  employeeId: string;
  locationId: string;
  startDate: string;
  endDate: string;
  days: number;
  status: TimeOffStatus;
  createdAt: Date;
}
