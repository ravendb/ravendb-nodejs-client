import {TypeUtil} from "../Utility/TypeUtil";
import { VError } from "verror";

export function throwError(message: string, errName: RavenErrorType);
export function throwError(message: string, errName: RavenErrorType, errCause?: Error);
export function throwError(message: string, errName: string, errCause?: Error);
export function throwError(
  message: string, errName?: RavenErrorType | string, errCause?: Error, info?: { [key: string]: any }) {
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
| "AggregateException";