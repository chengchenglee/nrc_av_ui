import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { ObjectSchema, ValidationError } from 'joi';

@Injectable()
export class SocketJoiValidatorPipe implements PipeTransform {
  constructor(private readonly schema: ObjectSchema) {}

  private mapJoiError(error: ValidationError) {
    const errorObj = {};

    for (const item of error.details) {
      errorObj[item.context.key] = item.message;
    }
    return errorObj;
  }

  transform(input: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return input;
    }

    const { error, value } = this.schema.validate(input, { abortEarly: false });

    if (error && typeof input !== 'string') {
      throw new WsException(this.mapJoiError(error));
    }

    return value;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
}
