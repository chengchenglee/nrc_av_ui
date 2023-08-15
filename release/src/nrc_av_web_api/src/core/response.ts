import { HttpStatus } from '@nestjs/common';
import { Response } from 'express';

export class ControllerResponse {
  res: Response;
  data: any;
  statusCode: HttpStatus;

  constructor(res: Response, data: any, statusCode: HttpStatus) {
    this.res = res;
    this.data = data;
    this.statusCode = statusCode;
  }
}
