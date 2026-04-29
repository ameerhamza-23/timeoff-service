import { IsString, IsNotEmpty } from 'class-validator';

export class GetBalanceRequestDto {
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsString()
  @IsNotEmpty()
  locationId: string;
}
