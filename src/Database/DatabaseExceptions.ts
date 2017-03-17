export abstract class AbstractException extends Error {
  constructor(message) {
    super(message);

    this.name = this.constructor.name;

    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = (new Error(message)).stack;
    }
  }
}

export class InvalidOperationException extends AbstractException {

}

export class ErrorResponseException extends AbstractException {

}

export class DocumentDoesNotExistsException extends AbstractException {

}

export class NonUniqueObjectException extends AbstractException {

}

export class FetchConcurrencyException extends AbstractException {

}

export class ArgumentOutOfRangeException extends AbstractException {

}

export class DatabaseDoesNotExistException extends AbstractException {

}

export class AuthorizationException extends AbstractException {

}

export class IndexDoesNotExistException extends AbstractException {

}

