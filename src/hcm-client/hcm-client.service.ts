import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  HcmBalanceEntry,
  HcmBalanceResponse,
  HcmDeductResponse,
} from './dto/hcm-balance.dto';

@Injectable()
export class HcmClientService {
  private readonly logger = new Logger(HcmClientService.name);
  private readonly baseUrl: string;

  constructor(private readonly httpService: HttpService) {
    this.baseUrl = process.env.HCM_BASE_URL ?? 'http://localhost:4000';
  }

  // Real-time balance check — used as defensive validation before deducting
  async getBalance(
    employeeId: string,
    locationId: string,
  ): Promise<HcmBalanceResponse | null> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get<HcmBalanceResponse>(
          `${this.baseUrl}/hcm/balance/${employeeId}/${locationId}`,
        ),
      );
      return data;
    } catch (error) {
      this.logger.error(
        `HCM getBalance failed for ${employeeId}@${locationId}`,
        error,
      );
      return null;
    }
  }

  async deduct(
    employeeId: string,
    locationId: string,
    days: number,
  ): Promise<HcmDeductResponse> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.post<HcmDeductResponse>(`${this.baseUrl}/hcm/deduct`, {
          employeeId,
          locationId,
          days,
        }),
      );
      this.logger.log(
        `HCM deduct response for ${employeeId}@${locationId}: ${JSON.stringify(data)}`,
      );
      return data;
    } catch (error) {
      this.logger.error(
        `HCM deduct failed for ${employeeId}@${locationId}`,
        error,
      );
      return { success: false, error: 'HCM unavailable' };
    }
  }

  async rollback(
    employeeId: string,
    locationId: string,
    days: number,
  ): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/hcm/rollback`, {
          employeeId,
          locationId,
          days,
        }),
      );
      this.logger.log(
        `HCM rollback successful for ${employeeId}@${locationId}`,
      );
    } catch (error) {
      this.logger.error(
        `HCM rollback failed for ${employeeId}@${locationId}`,
        error,
      );
    }
  }

  async getBatchBalances(): Promise<HcmBalanceEntry[]> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get<HcmBalanceEntry[]>(`${this.baseUrl}/hcm/balances`),
      );
      this.logger.log(`HCM batch fetched ${data.length} balance entries`);
      return data;
    } catch (error) {
      this.logger.error('HCM batch balance fetch failed', error);
      return [];
    }
  }
}
