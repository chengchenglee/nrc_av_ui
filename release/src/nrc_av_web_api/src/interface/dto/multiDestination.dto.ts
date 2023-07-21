import { ApiProperty } from '@nestjs/swagger';
import joi from 'joi';
import { DestinationDTO, vDestDTO } from './destination.dto';

export class MultiDestinationDTO {
  @ApiProperty({
    description: 'id',
    example: 1
  })
  id: number;

  @ApiProperty({
    description: 'name',
    example: 'Autonomy 5k v1'
  })
  name: string;

  @ApiProperty({
    description: 'destination',
    example: [
      { posX: 4695.0, posY: -1138.0, posTh: -3.066 },
      { posX: 4017.0, posY: -776.0, posTh: 1.607 },
      { posX: 3462.0, posY: -648.0, posTh: -3.066 },
      { posX: 3336.0, posY: -596.0, posTh: -1.603 },
      { posX: 3834.0, posY: -1720.0, posTh: -1.603 },
      { posX: 4907.0, posY: -1862.0, posTh: 0.0 },
      { posX: 4700.0, posY: -2200.0, posTh: -3.066 }
    ]
  })
  destinations: DestinationDTO[];
}

export const vMultiDestDTO = joi.object<MultiDestinationDTO>({
  id: joi.number(),
  name: joi.string().required(),
  destinations: joi.array().items(vDestDTO).required()
});
