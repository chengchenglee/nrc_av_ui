export interface IErrorResponse {
  status: 'error';
  message?: any;
}

export interface ISuccessResponse {
  status: 'success';
  data?: any;
}

export type IResponse = IErrorResponse | ISuccessResponse;
