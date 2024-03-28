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
import { plainToInstance } from 'class-transformer';
import { Response, Request } from 'express';
import {
  HttpBodyValidatorPipe,
  HttpQueryValidatorPipe,
  UserGuard,
  Serialize,
  TimeoutInterceptor,
  Interface,
  ControllerResponse,
  PermissionEnum
} from '../core';
import { PermissionRequired } from '../core/guards/permission.decorator';
import { InterfaceContentDTO } from '../interfaceContent/dto/interfaceContent.dto';
import { InterfaceContentService } from './../interfaceContent/interfaceContent.service';
import { InterfaceDTO, vInterfaceDTO } from './dto/interface.dto';
import { InterfaceCloneDTO, vInterfaceCloneDTO } from './dto/interfaceClone.dto';
import { InterfaceFilteringDTO, vInterfaceFilteringDTO } from './dto/interfaceFiltering.dto';
import { InterfaceNoSubDTO } from './dto/interfaceNoSub.dto';
import { InterfaceService } from './interface.service';
import { InterfaceSerialize } from './serialize/interface.serialize';

@ApiTags('interface')
@Controller('interface')
@ApiCookieAuth()
@UseGuards(UserGuard)
@UseInterceptors(TimeoutInterceptor)
export class InterfaceController {
  constructor(
    private readonly interfaceService: InterfaceService,
    private readonly interfaceContentService: InterfaceContentService
  ) {}

  @Get('/list')
  @UsePipes(new HttpQueryValidatorPipe(vInterfaceFilteringDTO))
  @Serialize(InterfaceSerialize)
  @PermissionRequired(PermissionEnum.READ_INTERFACE)
  async listInterfaces(@Res() res: Response, @Query() query: InterfaceFilteringDTO) {
    return new ControllerResponse(
      res,
      await this.interfaceService.listInterfaces(query),
      HttpStatus.OK
    );
  }

  @Get('/clone/:id')
  @Serialize(Interface)
  @UsePipes(new HttpBodyValidatorPipe(vInterfaceCloneDTO))
  @PermissionRequired(PermissionEnum.UPDATE_INTERFACE)
  async cloneInterface(
    @Res() res: Response,
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
    @Query() query: InterfaceCloneDTO
  ) {
    return new ControllerResponse(
      res,
      await this.interfaceService.cloneInterface(id, query, req.user),
      HttpStatus.CREATED
    );
  }

  @Get('/:id')
  @Serialize(InterfaceNoSubDTO)
  @PermissionRequired(PermissionEnum.READ_INTERFACE)
  async getInterface(@Res() res: Response, @Param('id', ParseIntPipe) id: number) {
    return new ControllerResponse(
      res,
      await this.interfaceService.getInterfaceWithAllRelationsView(id),
      HttpStatus.OK
    );
  }

  @Get('/:id/content')
  @Serialize(InterfaceContentDTO)
  @PermissionRequired(PermissionEnum.READ_INTERFACE)
  async getInterfaceContent(@Res() res: Response, @Param('id', ParseIntPipe) id: number) {
    return new ControllerResponse(
      res,
      plainToInstance(
        InterfaceContentDTO,
        await this.interfaceContentService.getLatestInterfaceContent(id),
        {
          excludeExtraneousValues: true
        }
      ),
      HttpStatus.OK
    );
  }

  @Get('/name/:name')
  @Serialize(Interface)
  @PermissionRequired(PermissionEnum.READ_INTERFACE)
  async getInterfaceByName(@Res() res: Response, @Param('name') name: string) {
    try {
      const result = await this.interfaceService.getInterfaceByName(name);
      return new ControllerResponse(res, result, HttpStatus.OK);
    } catch (error) {
      return new ControllerResponse(
        res,
        { message: 'Internal Server Error' },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('/')
  @UsePipes(new HttpBodyValidatorPipe(vInterfaceDTO))
  @Serialize(Interface)
  @PermissionRequired(PermissionEnum.CREATE_INTERFACE)
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
  @PermissionRequired(PermissionEnum.DELETE_INTERFACE)
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
  @PermissionRequired(PermissionEnum.UPDATE_INTERFACE)
  async updateInterface(
    @Res() res: Response,
    @Body() body: InterfaceDTO,
    @Param('id', ParseIntPipe) id: number
  ) {
    return new ControllerResponse(
      res,
      await this.interfaceService.updateInterfaceWithSub(id, body),
      HttpStatus.OK
    );
  }
}
