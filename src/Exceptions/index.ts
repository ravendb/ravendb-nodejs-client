import {VError} from "verror";
import {closeHttpResponse} from "./../Utility/HttpUtil";
import {StatusCodes} from "../Http/StatusCode";
import {HttpResponse} from "../Primitives/Http";
import {JsonSerializer} from "../Mapping/Json/Serializer";

export function printError(err: Error): string {
    return VError.fullStack(err);
}

export function throwError(errName: RavenErrorType): never;
export function throwError(errName: RavenErrorType, message: string): never;
export function throwError(errName: RavenErrorType, message: string, errCause?: Error): never;
export function throwError(
    errName: RavenErrorType, message: string, errCause?: Error, info?: { [key: string]: any }): never;
export function throwError(
    errName: RavenErrorType | string = "RavenException",
    message?: string,
    errCause?: Error,
    info?: { [key: string]: any }): never {
    throw getError(errName, message, errCause, info);
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
    const error = new VError({
        name: errName,
        cause: errCause,
        info
    }, message);
    return error;
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
    | "ClientVersionMismatchException"
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
    | "OperationCancelledException"
    | "MappingError"
    | "UrlScrappingError"
    | "TestDriverTearDownError"
    | "FileNotFoundException"
    | "NotImplementedException"
    | "NodeIsPassiveException"
    | "ConfigurationException"
    | "CertificateNameMismatchException"
    | "BulkInsertStreamError"
    | "NotSupportedException";

export interface ExceptionSchema {
    url: string;
    type: string;
    message: string;
    error: string;
}

export interface ExceptionDispatcherArgs {
    message: string;
    error?: string;
    type?: string;
}

export class ExceptionDispatcher {

    private static _jsonSerializer: JsonSerializer = JsonSerializer.getDefaultForCommandPayload();

    public static get(opts: ExceptionDispatcherArgs, code: number): Error {
        const {message, error, type} = opts;
        if (code === StatusCodes.Conflict) {
            if (type.indexOf("DocumentConflictException") !== -1) {
                return getError("DocumentConflictException", message);
            }

            return getError("ConcurrencyException", message);
        }

        const determinedType = this._getType(type) as RavenErrorType;
        return getError(determinedType || "RavenException", error);
    }

    public static throwException(response: HttpResponse, body: string): void | never {
        if (!response) {
            throw getError("InvalidArgumentException", "Response cannot be null");
        }

        let errorToThrow: Error;
        try {
            const json: string = body;
            const schema: ExceptionSchema = ExceptionDispatcher._jsonSerializer.deserialize(json);

            if (response.statusCode === StatusCodes.Conflict) {
                errorToThrow = this._getConflictError(schema, json);
            } else {
                const determinedType = this._getType(schema.type) as RavenErrorType;
                errorToThrow = getError(determinedType || "RavenException", schema.error);
            }
        } catch (errThrowing) {
            errorToThrow = getError("RavenException", errThrowing.message, errThrowing);
        } finally {
            closeHttpResponse(response);
            response.request.abort();
        }

        throw errorToThrow;
    }

    private static _getConflictError(schema: ExceptionSchema, json: string) {
        if (schema.type.includes("DocumentConflictException")) {
            return getError("DocumentConflictException", schema.message, null, {json});
        }

        return getError("ConcurrencyException", schema.message);
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
