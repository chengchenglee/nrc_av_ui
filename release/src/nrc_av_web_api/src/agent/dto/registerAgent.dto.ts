import { IsString } from 'class-validator';
import joi from 'joi';
import { vehicleValidateSchema } from '../../core';

export class RegisterAgentDTO {
  @IsString()
  name: string;

  @IsString()
  model: string;

  @IsString()
  macAddress: string;

  @IsString()
  defaultInterface: string;

  @IsString()
  licenseNumber: string;

  @IsString()
  certKey: string;
}

export const vRegisterAgentDTO = joi.object<RegisterAgentDTO>({
  name: vehicleValidateSchema.name.required(),
  model: joi.string().required(),
  macAddress: vehicleValidateSchema.macAddress.required(),
  defaultInterface: joi.string().required(),
  licenseNumber: joi.string().required(),
  certKey: joi.string().required()
});
