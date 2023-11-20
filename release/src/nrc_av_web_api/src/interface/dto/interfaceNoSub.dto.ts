import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import joi from 'joi';
import { AlgorithmDTO, vAlgorithmDTO } from './algorithm.dto';
import { CommandDTO, vCommandDTO } from './command.dto';
import { InterfaceDestDTO, vInterfaceDestDTO } from './interfaceDestination.dto';
import { MachineDTO, vMachineDTO } from './machine.dto';
import { MultiDestinationDTO, vMultiDestDTO } from './multiDestination.dto';
import { SensorDTO, vSensorDTO } from './sensor.dto';

export class InterfaceNoSubDTO {
  @Expose()
  @ApiProperty({
    description: 'name',
    example: 'KellyTest'
  })
  name: string;

  @Expose()
  @ApiProperty({
    description: 'machines',
    example: [{ name: 'GPSBASE', addr: 'ddl-ntrip.stanford.edu' }],
    isArray: true
  })
  machines: MachineDTO[];

  @Expose()
  @ApiProperty({
    description: 'interface destination',
    example: [{ name: 'Dest 0', destination: { posX: 4695.0, posY: -1138.0, posTh: -3.066 } }],
    isArray: true
  })
  interfaceDestinations: InterfaceDestDTO[];

  @Expose()
  @ApiProperty({
    description: 'interface multi-destination',
    example: [
      {
        name: 'Autonomy 5k v1',
        destinations: [
          { posX: 4695.0, posY: -1138.0, posTh: -3.066 },
          { posX: 4017.0, posY: -776.0, posTh: 1.607 },
          { posX: 3462.0, posY: -648.0, posTh: -3.066 },
          { posX: 3336.0, posY: -596.0, posTh: -1.603 },
          { posX: 3834.0, posY: -1720.0, posTh: -1.603 },
          { posX: 4907.0, posY: -1862.0, posTh: 0.0 },
          { posX: 4700.0, posY: -2200.0, posTh: -3.066 }
        ]
      }
    ],
    isArray: true
  })
  multiDestinations: MultiDestinationDTO[];

  @Expose()
  @ApiProperty({
    description: 'sensors',
    example: [
      {
        name: 'CAR',
        errRate: 3,
        warnRate: 6,
        topicName: '/CtrlStateFLG',
        topicType: 'CtrlStateFLG'
      },
      {
        name: 'GPS',
        errRate: 3,
        warnRate: 8,
        topicName: '/dynamic_global_pose',
        topicType: 'DynamicPoseWithCovar'
      }
    ],
    isArray: true
  })
  sensors: SensorDTO[];

  @Expose()
  @ApiProperty({
    description: 'algorithms',
    example: [
      {
        name: 'DRV_A',
        errRate: 3,
        warnRate: 7,
        topicName: '/drivable_area_boundary_points',
        topicType: 'PointCloud2'
      },
      {
        name: 'VIS_SP',
        errRate: 3,
        warnRate: 5,
        topicName: '/visible_space_data',
        topicType: 'VisibleSpace'
      }
    ],
    isArray: true
  })
  algorithms: AlgorithmDTO[];

  @Expose()
  @ApiProperty({
    description: 'commands',
    example: [
      {
        name: '1 sim1',
        command: 'roslaunch nrc_av_ui sim1.launch',
        nodes: [{ name: 'sim1_node' }],
        inclByDef: false
      },
      {
        name: '1 sim2',
        command: 'rosrun nrc_av_ui sim2',
        nodes: [{ name: 'sim2' }],
        inclByDef: false
      }
    ],
    isArray: true
  })
  commands: CommandDTO[];
}

export const vInterfaceNoSubDTO = joi.object<InterfaceNoSubDTO>({
  name: joi.string().required(),
  machines: joi.array().items(vMachineDTO),
  interfaceDestinations: joi.array().items(vInterfaceDestDTO),
  multiDestinations: joi.array().items(vMultiDestDTO),
  sensors: joi.array().items(vSensorDTO),
  algorithms: joi.array().items(vAlgorithmDTO),
  commands: joi.array().items(vCommandDTO)
});
