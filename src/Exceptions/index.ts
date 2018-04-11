import { VError } from "verror";
import {TypeUtil} from "../Utility/TypeUtil";
import { parseJson } from "../Utility/JsonUtil";
import { StatusCodes } from "../Http/StatusCode";
import { HttpResponse } from "../Primitives/Http";
import { ObjectMapper } from "../Utility/Mapping";
import { getDefaultMapper } from "../Extensions/JsonExtensions";

export function throwError(errName: RavenErrorType);
export function throwError(errName: RavenErrorType, message: string);
export function throwError(errName: RavenErrorType, message: string, errCause?: Error);
export function throwError(errName: RavenErrorType, message: string, errCause?: Error, info?: { [key: string]: any });
export function throwError(errName: string, message: string, errCause?: Error);
export function throwError(errName: string, message: string, errCause?: Error, info?: { [key: string]: any });
export function throwError(
  errName: RavenErrorType | string = "RavenException", 
  message?: string, 
  errCause?: Error, 
  info?: { [key: string]: any }) {
  throw getError(message, errName, errCause, info); 
}

export function getError(errName: RavenErrorType, message: string): Error;
export function getError(
  errName: string, 
  message: string, 
  errCause?: Error, 
  info?: { [key: string]: any }): Error;
export function getError(
  errName: string, 
  message: string, 
  errCause?: Error): Error;
export function getError(
  errName: RavenErrorType | string = "RavenException", 
  message: string = "", 
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

    private static _mapper: ObjectMapper = getDefaultMapper();

    public static get(opts: ExceptionDispatcherArgs, code: number): Error {
        const { message, error, type } = opts;
        if (code === StatusCodes.Conflict) {
            if (type.indexOf("DocumentConflictException") !== -1) {
                return getError("DocumentConflictException", message);
            }

            return getError("ConcurrencyException", message);
        }

        const determinedType = this._getType(type) as RavenErrorType;
        return getError(determinedType || "RavenException", error);
    }

    public static throwException(response: HttpResponse): void {
        if (response === null) {
            throw getError("InvalidArgumentException", "Response cannot be null");
        }

        try {
            const json: string = response.body;
            const schema: ExceptionSchema = ExceptionDispatcher._mapper.deserialize(json);

            if (response.statusCode === StatusCodes.Conflict) {
                this._throwConflict(schema, json);
            }

            const determinedType = this._getType(schema.type) as RavenErrorType;
            throw getError(determinedType || "RavenException", schema.error);
        } catch (errThrowing) {
            throw getError("RavenException", errThrowing.message, errThrowing);
        } finally {
            response.destroy();
        }
    }

    private static _throwConflict(schema: ExceptionSchema, json: string) {
        if (schema.type.includes("DocumentConflictException")) {
            throw getError("DocumentConflictException", schema.message, null, { json });
        }

        throw getError("ConcurrencyException", schema.message);
    }

    private static _getType(typeAsString: string): string {
        if ("System.TimeoutException" === typeAsString) {
            return "TimeoutException";
        }
        const prefix = "Raven.Client.Exceptions.";
        if (typeAsString && typeAsString.startsWith(prefix)) {
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
