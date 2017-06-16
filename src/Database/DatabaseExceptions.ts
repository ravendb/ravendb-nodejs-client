import {TypeUtil} from "../Utility/TypeUtil";

export class RavenException extends Error {
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

export class InvalidOperationException extends RavenException {}
export class ErrorResponseException extends RavenException {}
export class DocumentDoesNotExistsException extends RavenException {}
export class NonUniqueObjectException extends RavenException {}
export class ConcurrencyException extends RavenException {}
export class ArgumentOutOfRangeException extends RavenException {}
export class DatabaseDoesNotExistException extends RavenException {}
export class AuthorizationException extends RavenException {}
export class IndexDoesNotExistException extends RavenException {}
export class DatabaseLoadTimeoutException extends RavenException {}
export class AuthenticationException extends RavenException {}
export class BadRequestException extends RavenException {}
export class BulkInsertAbortedException extends RavenException {}
export class BulkInsertProtocolViolationException extends RavenException {}
export class IndexCompilationException extends RavenException {}
export class TransformerCompilationException extends RavenException {}
export class DocumentConflictException extends RavenException {}
export class DocumentDoesNotExistException extends RavenException {}
export class DocumentParseException extends RavenException {}
export class IndexInvalidException extends RavenException {}
export class IndexOrTransformerAlreadyExistException extends RavenException {}
export class JavaScriptException extends RavenException {}
export class JavaScriptParseException extends RavenException {}
export class SubscriptionClosedException extends RavenException {}
export class SubscriptionDoesNotBelongToNodeException extends RavenException {}
export class SubscriptionDoesNotExistException extends RavenException {}
export class SubscriptionException extends RavenException {}
export class SubscriptionInUseException extends RavenException {}
export class TransformerDoesNotExistException extends RavenException {}
export class VersioningDisabledException extends RavenException {}
export class AllTopologyNodesDownException extends RavenException {}
export class BadResponseException extends RavenException {}
export class ChangeProcessingException extends RavenException {}
export class CommandExecutionException extends RavenException {}
export class NoLeaderException extends RavenException {}
export class CompilationException extends RavenException {}
export class ConflictException extends RavenException {}
export class DatabaseConcurrentLoadTimeoutException extends RavenException {}
export class DatabaseDisabledException extends RavenException {}
export class DatabaseLoadFailureException extends RavenException {}
export class DatabaseNotFoundException extends RavenException {}
export class NotSupportedOsException extends RavenException {}
export class SecurityException extends RavenException {}
export class ServerLoadFailureException extends RavenException {}
export class UnsuccessfulRequestException extends RavenException {}
export class CriticalIndexingException extends RavenException {}
export class IndexAnalyzerException extends RavenException {}
export class IndexCorruptionException extends RavenException {}
export class IndexOpenException extends RavenException {}
export class IndexWriteException extends RavenException {}
export class IndexWriterCreationException extends RavenException {}
export class StorageException extends RavenException {}
export class StreamDisposedException extends RavenException {}
export class LowMemoryException extends RavenException {}
export class IncorrectDllException extends RavenException {}
export class DiskFullException extends RavenException {}
export class InvalidJournalFlushRequestException extends RavenException {}
export class QuotaException extends RavenException {}
export class VoronUnrecoverableErrorException extends RavenException {}
export class NonDurableFileSystemException extends RavenException {}