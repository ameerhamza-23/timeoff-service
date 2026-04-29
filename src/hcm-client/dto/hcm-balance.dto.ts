// Shape of a single balance entry from HCM batch response
export interface HcmBalanceEntry {
  employeeId: string;
  locationId: string;
  availableDays: number;
}

export interface HcmBalanceResponse {
  employeeId: string;
  locationId: string;
  availableDays: number;
}

export interface HcmDeductResponse {
  success: boolean;
  remainingDays?: number;
  error?: string;
}
