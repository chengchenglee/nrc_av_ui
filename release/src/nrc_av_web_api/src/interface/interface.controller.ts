import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Res,
  UseGuards,
  UseInterceptors,
  UsePipes,
  Query,
  Put,
  Req
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { HttpBodyValidatorPipe, HttpQueryValidatorPipe, UserGuard } from '../core';
import { TimeoutInterceptor } from '../core/interceptors';
import { InterfaceDTO, vInterfaceDTO } from './dto/interface.dto';
import { InterfaceFilteringDTO, vInterfaceFilteringDTO } from './dto/interfaceFiltering.dto';
import { InterfaceService } from './interface.service';

@ApiTags('interface')
@Controller('interface')
@ApiCookieAuth()
@UseGuards(UserGuard)
@UseInterceptors(TimeoutInterceptor)
export class InterfaceController {
  constructor(private readonly interfaceService: InterfaceService) {}

  @Get('/list')
  @UsePipes(new HttpQueryValidatorPipe(vInterfaceFilteringDTO))
  async listInterfaces(@Res() res: Response, @Query() query: InterfaceFilteringDTO) {
    return res.status(HttpStatus.OK).send(await this.interfaceService.listInterfaces(query));
  }

  @Get('/:id')
  async getInterface(@Res() res: Response, @Param('id', ParseIntPipe) id: number) {
    return res
      .status(HttpStatus.OK)
      .send(await this.interfaceService.getInterfaceWithAllRelations(id));
  }

  @Get('/')
  async getInterfaceByName(@Res() res: Response, @Query('name') name: string) {
    return res.status(HttpStatus.OK).send(await this.interfaceService.getInterfaceByName(name));
  }

  @Post('/')
  @UsePipes(new HttpBodyValidatorPipe(vInterfaceDTO))
  async createInterface(@Res() res: Response, @Body() body: InterfaceDTO, @Req() req: Request) {
    return res
      .status(HttpStatus.OK)
      .send(await this.interfaceService.createInterface(body, req.user));
  }

  @Put('/:id')
  @UsePipes(new HttpBodyValidatorPipe(vInterfaceDTO))
  async updateInterface(
    @Res() res: Response,
    @Body() body: InterfaceDTO,
    @Param('id', ParseIntPipe) id: number
  ) {
    return res.status(HttpStatus.OK).send(await this.interfaceService.updateInterface(id, body));
  }
}
