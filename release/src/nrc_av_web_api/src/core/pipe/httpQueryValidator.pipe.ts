import { Injectable, PipeTransform } from '@nestjs/common';
import { ObjectSchema } from 'joi';

@Injectable()
export class HttpQueryValidatorPipe implements PipeTransform {
  constructor(private readonly schema: ObjectSchema) {}

  transform(input: any) {
    const { value } = this.schema.validate(input, {
      convert: true,
      stripUnknown: true
    });
    return value;
  }
}
