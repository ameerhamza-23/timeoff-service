import { EmployeeRole, TimeOffStatus } from './enums';

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: EmployeeRole;
}

export interface Balance {
  employeeId: string;
  locationId: string;
  availableDays: number;
  usedDays: number;
}

export interface TimeOffRequest {
  id: string;
  employeeId: string;
  locationId: string;
  startDate: string;
  endDate: string;
  days: number;
  status: TimeOffStatus;
  createdAt: Date;
}
