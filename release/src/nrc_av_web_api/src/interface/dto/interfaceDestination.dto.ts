import { ApiProperty } from '@nestjs/swagger';
import joi from 'joi';
import { DestinationDTO, vDestDTO } from './destination.dto';

export class InterfaceDestDTO {
  @ApiProperty({
    description: 'interface id',
    example: 1
  })
  interfaceId: number;

  @ApiProperty({
    description: 'destination id',
    example: 1
  })
  destinationId: number;

  @ApiProperty({
    description: 'name',
    example: 'Dest 0'
  })
  name: string;

  @ApiProperty({
    description: 'destination',
    example: { posX: 4695.0, posY: -1138.0, posTh: -3.066 }
  })
  destination: DestinationDTO;
}

export const vInterfaceDestDTO = joi.object<InterfaceDestDTO>({
  interfaceId: joi.number(),
  destinationId: joi.number(),
  name: joi.string().required(),
  destination: vDestDTO.required()
});
