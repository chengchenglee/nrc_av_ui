import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import joi from 'joi';

export class InterfaceContentDTO {
  @Expose()
  @ApiProperty({
    description: 'content',
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

export const vInterfaceContentDTO = joi.object<InterfaceContentDTO>({
  content: joi.string().required()
});
