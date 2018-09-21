export type StatusCode = 200 
  | 201 
  | 202 
  | 203
  | 204 
  | 301 
  | 302 
  | 304 
  | 400 
  | 401 
  | 412 
  | 403 
  | 404 
  | 408 
  | 409 
  | 410 
  | 417 
  | 500 
  | 502 
  | 503 
  | 504;

export class StatusCodes {
  public static readonly Ok: StatusCode = 200;
  public static readonly Created: StatusCode = 201;
  public static readonly Accepted: StatusCode = 202;
  public static readonly NonAuthoritativeInformation: StatusCode = 203;
  public static readonly NoContent: StatusCode = 204;
  public static readonly MovedPermanently: StatusCode = 301;
  public static readonly Found: StatusCode = 302;
  public static readonly NotModified: StatusCode = 304;
  public static readonly BadRequest: StatusCode = 400;
  public static readonly Unauthorized: StatusCode = 401;
  public static readonly Forbidden: StatusCode = 403;
  public static readonly NotFound: StatusCode = 404;
  public static readonly RequestTimeout: StatusCode = 408;
  public static readonly Conflict: StatusCode = 409;
  public static readonly PreconditionFailed: StatusCode = 412;
  public static readonly ExpectationFailed: StatusCode = 417;
  public static readonly InternalServerError: StatusCode = 500;
  public static readonly BadGateway: StatusCode = 502;
  public static readonly ServiceUnavailable: StatusCode = 503;
  public static readonly GatewayTimeout: StatusCode = 504;
  public static readonly Gone: StatusCode = 410;
}
