export type StatusCode = 200 | 201 | 202 | 204 | 301 | 302 | 304 | 400 | 401 | 412 | 403 | 404 | 409 | 417 | 500 | 502 | 503 | 504;

export class StatusCodes {
  public static readonly Ok: StatusCode = 200;
  public static readonly Created: StatusCode = 201;
  public static readonly Accepted: StatusCode = 202;
  public static readonly NoContent: StatusCode = 204;
  public static readonly MovedPermanently: StatusCode = 301;
  public static readonly Found: StatusCode = 302;
  public static readonly NotModified: StatusCode = 304;
  public static readonly BadRequest: StatusCode = 400;
  public static readonly Unauthorized: StatusCode = 401;
  public static readonly Forbidden: StatusCode = 403;
  public static readonly NotFound: StatusCode = 404;
  public static readonly Conflict: StatusCode = 409;
  public static readonly PreconditionFailed: StatusCode = 412;
  public static readonly ExpectationFailed: StatusCode = 417;
  public static readonly InternalServerError: StatusCode = 500;
  public static readonly BadGateway: StatusCode = 502;
  public static readonly ServiceUnavailable: StatusCode = 503;
  public static readonly GatewayTimeout: StatusCode = 504;

  public static isOk(statusCode: StatusCode): boolean {
    return statusCode === this.Ok;
  }

  public static isCreated(statusCode: StatusCode): boolean {
    return statusCode === this.Created;
  }

  public static isAccepted(statusCode: StatusCode): boolean {
    return statusCode === this.Accepted;
  }

  public static isNoContent(statusCode: StatusCode): boolean {
    return statusCode === this.NoContent;
  }

  public static isMovedPermanently(statusCode: StatusCode): boolean {
    return statusCode === this.MovedPermanently;
  }

  public static isFound(statusCode: StatusCode): boolean {
    return statusCode === this.Found;
  }

  public static isNotModified(statusCode: StatusCode): boolean {
    return statusCode === this.NotModified;
  }

  public static isBadRequest(statusCode: StatusCode): boolean {
    return statusCode === this.BadRequest;
  }

  public static isUnauthorized(statusCode: StatusCode): boolean {
    return statusCode === this.Unauthorized;
  }

  public static isForbidden(statusCode: StatusCode): boolean {
    return statusCode === this.Forbidden;
  }

  public static isNotFound(statusCode: StatusCode): boolean {
    return statusCode === this.NotFound;
  }

  public static isConflict(statusCode: StatusCode): boolean {
    return statusCode === this.Conflict;
  }

  public static isPreconditionFailed(statusCode: StatusCode): boolean {
    return statusCode === this.PreconditionFailed;
  }

  public static isExpectationFailed(statusCode: StatusCode): boolean {
    return statusCode === this.ExpectationFailed;
  }

  public static isInternalServerError(statusCode: StatusCode): boolean {
    return statusCode === this.InternalServerError;
  }

  public static isBadGateway(statusCode: StatusCode): boolean {
    return statusCode === this.BadGateway;
  }
  public static isServiceUnavailable(statusCode: StatusCode): boolean {
    return statusCode === this.ServiceUnavailable;
  }

  public static isGatewayTimeout(statusCode: StatusCode): boolean {
    return statusCode === this.GatewayTimeout;
  }
}