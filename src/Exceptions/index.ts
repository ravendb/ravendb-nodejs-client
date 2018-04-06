import { VError } from "verror";
import {TypeUtil} from "../Utility/TypeUtil";
import { StatusCodes } from "../Http/StatusCode";
import { HttpResponse } from "../Primitives/Http";

export function throwError(errName: RavenErrorType);
export function throwError(message: string, errName: RavenErrorType);
export function throwError(message: string, errName: RavenErrorType);
export function throwError(message: string, errName: RavenErrorType, errCause?: Error);
export function throwError(message: string, errName: string, errCause?: Error);
export function throwError(
  message: string = "", 
  errName: RavenErrorType | string = "RavenException", 
  errCause?: Error, 
  info?: { [key: string]: any }) {
  throw getError(message, errName, errCause, info); 
}

export function getError(
  message: string, 
  errName?: RavenErrorType | string, 
  errCause?: Error, 
  info?: { [key: string]: any }): Error {
  return new VError({
    name: errName,
    cause: errCause,
    info
  }, message);
}

export type RavenErrorType = "RavenException"
| "NotSupportedException"
| "InvalidOperationException"
| "InvalidArgumentException"
| "ErrorResponseException"
| "DocumentDoesNotExistsException"
| "NonUniqueObjectException"
| "ConcurrencyException"
| "ArgumentNullException"
| "ArgumentOutOfRangeException"
| "DatabaseDoesNotExistException"
| "AuthorizationException"
| "IndexDoesNotExistException"
| "DatabaseLoadTimeoutException"
| "AuthenticationException"
| "BadRequestException"
| "BulkInsertAbortedException"
| "BulkInsertProtocolViolationException"
| "IndexCompilationException"
| "TransformerCompilationException"
| "DocumentConflictException"
| "DocumentDoesNotExistException"
| "DocumentParseException"
| "IndexInvalidException"
| "IndexOrTransformerAlreadyExistException"
| "JavaScriptException"
| "JavaScriptParseException"
| "SubscriptionClosedException"
| "SubscriptionDoesNotBelongToNodeException"
| "SubscriptionDoesNotExistException"
| "SubscriptionException"
| "SubscriptionInUseException"
| "TransformerDoesNotExistException"
| "VersioningDisabledException"
| "TopologyNodeDownException"
| "AllTopologyNodesDownException"
| "BadResponseException"
| "ChangeProcessingException"
| "CommandExecutionException"
| "NoLeaderException"
| "CompilationException"
| "ConflictException"
| "DatabaseConcurrentLoadTimeoutException"
| "DatabaseDisabledException"
| "DatabaseLoadFailureException"
| "DatabaseNotFoundException"
| "NotSupportedOsException"
| "SecurityException"
| "ServerLoadFailureException"
| "UnsuccessfulRequestException"
| "CriticalIndexingException"
| "IndexAnalyzerException"
| "IndexCorruptionException"
| "IndexOpenException"
| "IndexWriteException"
| "IndexWriterCreationException"
| "StorageException"
| "StreamDisposedException"
| "LowMemoryException"
| "IncorrectDllException"
| "DiskFullException"
| "InvalidJournalFlushRequestException"
| "QuotaException"
| "VoronUnrecoverableErrorException"
| "NonDurableFileSystemException"
| "TimeoutException"
| "AggregateException"
| "OperationCancelledException";

export class ExceptionSchema {
    public url: string;
    public type: string;
    public message: string;
    public error: string;
}

export interface ExceptionDispatcherArgs {
    message: string;
    error?: string;
    type?: string;
}
export class ExceptionDispatcher {

    public static get(opts: ExceptionDispatcherArgs, code: number): Error {
        const { message, error, type } = opts;
        if (code === StatusCodes.Conflict) {
            if (type.indexOf("DocumentConflictException") !== -1) {
                return getError(message, "DocumentConflictException");
            }

            return getError(message, "ConcurrencyException");
        }

        const determinedType = this._getType(type) as RavenErrorType;
        return getError(error, determinedType || "RavenException");
    }

    public static throwException(response: HttpResponse): void {
        if (response === null) {
            throw getError("Response cannot be null", "InvalidArgumentException");
        }

        try {
            const json: string = response.body;
            const schema: ExceptionSchema = JSON.parse(json);

            if (response.statusCode === StatusCodes.Conflict) {
                this._throwConflict(schema, json);
            }

            const determinedType = this._getType(schema.type) as RavenErrorType;
            throw getError(schema.error, determinedType || "RavenException");
        } catch (errThrowing) {
            throw getError(errThrowing.message, "RavenException", errThrowing);
        } finally {
            response.destroy();
        }
    }

    private static _throwConflict(schema: ExceptionSchema, json: string) {
        if (schema.type.includes("DocumentConflictException")) {
            throw getError(schema.message, "DocumentConflictException", null, { json });
        }

        throw getError(schema.message, "ConcurrencyException");
    }

    private static _getType(typeAsString: string): string {
        if ("System.TimeoutException" === typeAsString) {
            return "TimeoutException";
        }
        const prefix = "Raven.Client.Exceptions.";
        if (typeAsString.startsWith(prefix)) {
            const exceptionName = typeAsString.substring(prefix.length);
            if (exceptionName.indexOf(".") !== -1) {
                const tokens = exceptionName.split(".");
                return tokens[tokens.length - 1] as RavenErrorType;
            }

            return exceptionName;
        } else {
            return null;
        }
    }
}
