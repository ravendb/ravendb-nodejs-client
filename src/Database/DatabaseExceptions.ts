import {TypeUtil} from "../Utility/TypeUtil";

export abstract class RavenException extends Error {
  constructor(message) {
    super(message);

    this.name = this.constructor.name;

    if (TypeUtil.isFunction(Error.captureStackTrace)) {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = (new Error(message)).stack;
    }
  }
}

export class InvalidOperationException extends RavenException {

}

export class ErrorResponseException extends RavenException {

}

export class DocumentDoesNotExistsException extends RavenException {

}

export class NonUniqueObjectException extends RavenException {

}

export class FetchConcurrencyException extends RavenException {

}

export class ArgumentOutOfRangeException extends RavenException {

}

export class DatabaseDoesNotExistException extends RavenException {

}

export class AuthorizationException extends RavenException {

}

export class IndexDoesNotExistException extends RavenException {

}

export class TimeoutException extends RavenException {

}

export class AuthenticationException extends RavenException {

}

export class RequestException extends RavenException {

}




