import { IsArray, IsNumber, IsString } from 'class-validator';
import { CommandsStatusDTO } from './commandsStatus.dto';
import { ErrorResponseDTO } from './errorResponse.dto';
import { TopicStatusDTO } from './topicStatus.dto';

export class SubSystemStatusDTO {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsString()
  type: string;

  @IsArray()
  commands: CommandsStatusDTO[];

  @IsArray()
  topics: TopicStatusDTO[];

  @IsNumber()
  diagLed: string;

  @IsString()
  diagnostic: string;

  @IsArray()
  depends: string[];

  @IsArray()
  error: ErrorResponseDTO[];
}
