import { IsNumber } from 'class-validator';

export class ExtraVehicleInformationDTO {
  @IsNumber()
  latitude: number;
  @IsNumber()
  longitude: number;
  @IsNumber()
  velocity: number;
}
