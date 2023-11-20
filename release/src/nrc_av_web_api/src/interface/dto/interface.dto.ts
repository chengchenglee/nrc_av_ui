import { ApiProperty } from '@nestjs/swagger';
import joi from 'joi';
import { InterfaceDestDTO, vInterfaceDestDTO } from './interfaceDestination.dto';
import { MachineDTO, vMachineDTO } from './machine.dto';
import { MultiDestinationDTO, vMultiDestDTO } from './multiDestination.dto';
import { SubSystemDTO, vSubSystemDTO } from './subsystem.dto';

export class InterfaceDTO {
  @ApiProperty({
    description: 'name',
    example: 'KellyTest'
  })
  name: string;

  @ApiProperty({
    description: 'machines',
    example: [{ name: 'GPSBASE', addr: 'ddl-ntrip.stanford.edu' }],
    isArray: true
  })
  machines: MachineDTO[];

  @ApiProperty({
    description: 'interface destination',
    example: [{ name: 'Dest 0', destination: { posX: 4695.0, posY: -1138.0, posTh: -3.066 } }],
    isArray: true
  })
  interfaceDestinations: InterfaceDestDTO[];

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

  @ApiProperty({
    description: 'sub system',
    example: [
      {
        name: 'Pose',
        type: 'Sensor',
        commands: [
          {
            name: '1 sim1_pose',
            nodes: [{ name: 'sim1_node' }],
            command: 'roslaunch nrc_av_ui sim1.launch',
            inclByDef: false
          },
          {
            name: '1 sim2_pose',
            command: 'rosrun nrc_av_ui sim2',
            nodes: [{ name: 'sim2' }],
            inclByDef: false,
            launchTime: 0.0
          }
        ],
        topics: [
          {
            name: 'CAR_POSE',
            normalRate: 10.0,
            errRate: 3.0,
            warnRate: 6.0,
            topicName: '/CtrlStateFLG',
            topicType: 'CtrlStateFLG'
          },
          {
            name: 'GPS_POSE',
            normalRate: 10.0,
            errRate: 3.0,
            warnRate: 8.0,
            topicName: '/dynamic_global_pose',
            topicType: 'DynamicPoseWithCovar'
          }
        ],
        depends: []
      },
      {
        name: 'GPS_RAW',
        type: 'Sensor',
        commands: [
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
            inclByDef: false,
            launchTime: 0.0
          }
        ],
        topics: [
          {
            name: 'CAR',
            normalRate: 10.0,
            errRate: 3.0,
            warnRate: 6.0,
            topicName: '/CtrlStateFLG',
            topicType: 'CtrlStateFLG'
          },
          {
            name: 'GPS',
            normalRate: 10.0,
            errRate: 3.0,
            warnRate: 8.0,
            topicName: '/dynamic_global_pose',
            topicType: 'DynamicPoseWithCovar'
          }
        ],
        depends: ['Pose']
      }
    ],
    isArray: true
  })
  subSystems: SubSystemDTO[];

  @ApiProperty({
    description: 'yaml',
    example: `Configuration:
  Name: KellyTest

Subsystem:
  Pose:
    Type: Sensor
    Description: Pose Connection
    HealthTopics:
      - HealthTopic: /CtrlStateFLG
        HealthName: CAR_POSE
        HealthTopicType: CtrlStateFLG
        NomWarnErrRate: 10, 6, 3
      - HealthTopic: /dynamic_global_pose
        HealthName: GPS_POSE
        HealthTopicType: DynamicPoseWithCovar
        NomWarnErrRate: 10, 6, 3
    Commands:
      - Name: 1 sim1_pose
        Command: roslaunch nrc_av_ui sim1.launch
        Type: Software
        LaunchTime: 0.0
        Nodes:
          - Name: sim1_node
      - Name: 1 sim12
        Command: rosrun nrc_av_ui_ui sim2
        Type: Software
        Nodes:
          - Name: sim2
        LaunchTime: 0.0
    DiagLED: 1
    Depends:
    Diagnostic:

  GPS_RAW:
    Type: Sensor
    Description: GPS_RAW Connection
    HealthTopics:
      - HealthTopic: /CtrlStateFLG
        HealthName: CAR_POSE
        HealthTopicType: CtrlStateFLG
        NomWarnErrRate: 10, 6, 3
      - HealthTopic: /dynamic_global_pose
        HealthName: GPS_POSE
        HealthTopicType: DynamicPoseWithCovar
        NomWarnErrRate: 10, 6, 3
    Commands:
      - Name: 1 sim1_pose
        Command: roslaunch nrc_av_ui sim1.launch
        Type: Software
        LaunchTime: 0.0
        Nodes:
          - Name: sim1_node
      - Name: 1 sim12
        Command: rosrun nrc_av_ui_ui sim2
        Type: Software
        Nodes:
          - Name: sim2
        LaunchTime: 0.0
    DiagLED: 7
    Timeout:
    DiagRetry:
    Depends: Pose
    Diagnostic:`
  })
  content: string;
}

export const vInterfaceDTO = joi.object<InterfaceDTO>({
  name: joi.string().required(),
  machines: joi.array().items(vMachineDTO),
  interfaceDestinations: joi.array().items(vInterfaceDestDTO),
  multiDestinations: joi.array().items(vMultiDestDTO),
  subSystems: joi.array().items(vSubSystemDTO),
  content: joi.string().required()
});
