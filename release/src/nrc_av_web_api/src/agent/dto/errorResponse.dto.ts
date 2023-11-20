import { IsNumber, IsString } from 'class-validator';

export class ErrorResponseDTO {
  @IsString()
  status: string;

  @IsString()
  message: string;

  @IsNumber()
  subSystemId: number;
}
