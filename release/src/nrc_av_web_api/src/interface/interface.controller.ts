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
  Req,
  Delete
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Response, Request } from 'express';
import {
  HttpBodyValidatorPipe,
  HttpQueryValidatorPipe,
  UserGuard,
  Serialize,
  TimeoutInterceptor,
  Interface,
  ControllerResponse
} from '../core';
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
  @Serialize(Interface)
  async listInterfaces(@Res() res: Response, @Query() query: InterfaceFilteringDTO) {
    return new ControllerResponse(
      res,
      await this.interfaceService.listInterfaces(query),
      HttpStatus.OK
    );
  }

  @Get('/:id')
  @Serialize(Interface)
  async getInterface(@Res() res: Response, @Param('id', ParseIntPipe) id: number) {
    return new ControllerResponse(
      res,
      await this.interfaceService.getInterfaceWithAllRelations(id),
      HttpStatus.OK
    );
  }

  @Post('/')
  @UsePipes(new HttpBodyValidatorPipe(vInterfaceDTO))
  @Serialize(Interface)
  async createInterface(@Res() res: Response, @Body() body: InterfaceDTO, @Req() req: Request) {
    return new ControllerResponse(
      res,
      await this.interfaceService.createInterface(body, req.user),
      HttpStatus.CREATED
    );
  }

  @Delete('/:id')
  @UsePipes(new HttpBodyValidatorPipe(vInterfaceDTO))
  @Serialize(Interface)
  async deleteInterface(@Res() res: Response, @Param('id', ParseIntPipe) id: number) {
    return new ControllerResponse(
      res,
      await this.interfaceService.deleteInterface(id),
      HttpStatus.OK
    );
  }

  @Put('/:id')
  @UsePipes(new HttpBodyValidatorPipe(vInterfaceDTO))
  @Serialize(Interface)
  async updateInterface(
    @Res() res: Response,
    @Body() body: InterfaceDTO,
    @Param('id', ParseIntPipe) id: number
  ) {
    return new ControllerResponse(
      res,
      await this.interfaceService.updateInterface(id, body),
      HttpStatus.OK
    );
  }
}
