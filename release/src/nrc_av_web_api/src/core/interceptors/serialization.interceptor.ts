import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  UseInterceptors
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { map, Observable } from 'rxjs';

interface ClassContructor {
  new (...args: any[]): object;
}

const convertData = (data: any[], dto: any) => {
  if (data) {
    return data.map((data: any) => plainToInstance(dto, data, { excludeExtraneousValues: true }));
  }
  return data;
};

@Injectable()
export class SerializeInterceptor implements NestInterceptor {
  constructor(private dto: any) {}
  intercept(context: ExecutionContext, handler: CallHandler): Observable<any> {
    return handler.handle().pipe(
      map((response: any) => {
        if (response.data?.total !== undefined) {
          if (response.data.interfaces) {
            response.data.interfaces = convertData(response.data.interfaces, this.dto);
          }
          if (response.data.users) {
            response.data.users = convertData(response.data.users, this.dto);
          }
        } else {
          response.data = plainToInstance(this.dto, response.data, {
            excludeExtraneousValues: true
          });
        }

        return response.res.status(response.statusCode).send(response.data);
      })
    );
  }
}

export function Serialize(dto: ClassContructor) {
  return UseInterceptors(new SerializeInterceptor(dto));
}
