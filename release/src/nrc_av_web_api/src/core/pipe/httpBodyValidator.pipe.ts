import { HttpException, Injectable, PipeTransform, HttpStatus } from '@nestjs/common';
import { ObjectSchema, ValidationError } from 'joi';

@Injectable()
export class HttpBodyValidatorPipe implements PipeTransform {
  constructor(private readonly schema: ObjectSchema) {}

  private mapJoiError(error: ValidationError) {
    const errorObj = {};

    for (const item of error.details) {
      errorObj[item.context.key] = item.message;
    }
    return errorObj;
  }

  transform(input: any) {
    if (input && input.mimetype) {
      return input;
    }

    const { error, value } = this.schema.validate(input, { abortEarly: false });

    if (error && typeof input !== 'string') {
      throw new HttpException(this.mapJoiError(error), HttpStatus.BAD_REQUEST);
    }

    return value;
  }
}
