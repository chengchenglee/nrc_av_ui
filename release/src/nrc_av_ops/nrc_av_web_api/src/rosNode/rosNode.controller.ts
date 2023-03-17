import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('ROSNodes')
@Controller('rosNodes')
export class ROSNodesController {}
