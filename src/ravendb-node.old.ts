// global imports
import * as _ from 'lodash';
import * as crypto from "crypto";
import * as uuid from 'uuid';
import * as moment from 'moment';
import * as BluebirdPromise from 'bluebird';
import * as pluralize from 'pluralize';
import * as AsyncLock from 'async-lock';
import * as EventEmitter from 'events';
import * as Request from 'request';
import * as XRegExp from "xregexp";
import * as RequestPromise from 'request-promise';

// typings
export {AbstractCallback, EmptyCallback, EntityIdCallback, EntityCallback, EntitiesArrayCallback, EntitiesCountCallback, QueryResultsCallback} from './Typedef/Callbacks';
export {PromiseResolver, PromiseResolve, PromiseReject} from './Utility/PromiseResolver';
export {IDocumentStore} from './Documents/IDocumentStore';
export {IDocumentSession, ISessionOptions, ISessionOperationOptions} from './Documents/Session/IDocumentSession';
export {IDocumentQueryConditions} from './Documents/Session/IDocumentQueryConditions';
export {IDocumentQueryBase, IRawDocumentQuery, IDocumentQuery, IDocumentQueryOptions} from './Documents/Session/IDocumentQuery';
export {IQueryBuilder} from './Documents/Session/Query/IQueryBuilder';
export {IHiloIdGenerator} from './Hilo/IHiloIdGenerator';
export {RequestMethods, RequestMethod} from './Http/Request/RequestMethod';
export {FieldIndexingOption, FieldIndexingOptions} from './Database/Indexes/FieldIndexingOption';
export {IndexLockMode} from './Database/Indexes/IndexLockMode';
export {FieldTermVectorOption} from './Database/Indexes/FieldTermVectorOption';
export {ConcurrencyCheckMode, ConcurrencyCheckModes} from './Database/ConcurrencyCheckMode';
export {IndexPriority} from './Database/Indexes/IndexPriority';
export {StatusCode, StatusCodes} from './Http/Response/StatusCode';
export {ILockDoneCallback, ILockCallback} from './Typedef/LockCallbacks';
export {IRavenObject} from './Typedef/IRavenObject';
export {IOptionsSet} from './Typedef/IOptionsSet';
export {IJsonable, IJsonConvertible, IStringable, IDisposable} from './Typedef/Contracts';
export {IRavenResponse} from './Database/RavenCommandResponse';
export {IHeaders} from './Http/IHeaders';
export {IResponse, IResponseBody} from './Http/Response/IResponse';
export {IAuthOptions, IStoreAuthOptions, IRequestAuthOptions} from './Auth/AuthOptions';

//exceptions
export {
  RavenException,
  NotSupportedException,
  InvalidOperationException,
  InvalidArgumentException,
  ErrorResponseException,
  DocumentDoesNotExistsException,
  NonUniqueObjectException,
  ConcurrencyException,
  ArgumentNullException,
  ArgumentOutOfRangeException,
  DatabaseDoesNotExistException,
  AuthorizationException,
  IndexDoesNotExistException,
  DatabaseLoadTimeoutException,
  AuthenticationException,
  BadRequestException,
  BulkInsertAbortedException,
  BulkInsertProtocolViolationException,
  IndexCompilationException,
  TransformerCompilationException,
  DocumentConflictException,
  DocumentDoesNotExistException,
  DocumentParseException,
  IndexInvalidException,
  IndexOrTransformerAlreadyExistException,
  JavaScriptException,
  JavaScriptParseException,
  SubscriptionClosedException,
  SubscriptionDoesNotBelongToNodeException,
  SubscriptionDoesNotExistException,
  SubscriptionException,
  SubscriptionInUseException,
  TransformerDoesNotExistException,
  VersioningDisabledException,
  TopologyNodeDownException,
  AllTopologyNodesDownException,
  BadResponseException,
  ChangeProcessingException,
  CommandExecutionException,
  NoLeaderException,
  CompilationException,
  ConflictException,
  DatabaseConcurrentLoadTimeoutException,
  DatabaseDisabledException,
  DatabaseLoadFailureException,
  DatabaseNotFoundException,
  NotSupportedOsException,
  SecurityException,
  ServerLoadFailureException,
  UnsuccessfulRequestException,
  CriticalIndexingException,
  IndexAnalyzerException,
  IndexCorruptionException,
  IndexOpenException,
  IndexWriteException,
  IndexWriterCreationException,
  StorageException,
  StreamDisposedException,
  LowMemoryException,
  IncorrectDllException,
  DiskFullException,
  InvalidJournalFlushRequestException,
  QuotaException,
  VoronUnrecoverableErrorException,
  NonDurableFileSystemException,
  AggregateException
} from './Database/DatabaseExceptions';

// classes
export {RavenCommandRequestOptions, RavenCommand} from './Database/RavenCommand';
export {GetDocumentCommand} from './Database/Commands/GetDocumentCommand';
export {DeleteDocumentCommand} from './Database/Commands/DeleteDocumentCommand';
export {PutDocumentCommand} from './Database/Commands/PutDocumentCommand';
export {QueryCommand} from './Database/Commands/QueryCommand';
export {GetTopologyCommand} from './Database/Commands/GetTopologyCommand';
export {GetClusterTopologyCommand} from './Database/Commands/GetClusterTopologyCommand';
export {GetOperationStateCommand} from './Database/Commands/GetOperationStateCommand';
export {QueryOperationOptions} from './Database/Operations/QueryOperationOptions';
export {PutIndexesCommand} from './Database/Commands/PutIndexesCommand';
export {BatchCommand} from './Database/Commands/BatchCommand';
export {QueryBasedCommand} from './Database/Commands/QueryBasedCommand';
export {CreateDatabaseCommand} from './Database/Commands/CreateDatabaseCommand';
export {DeleteByQueryCommand} from './Database/Commands/DeleteByQueryCommand';
export {DeleteDatabaseCommand} from './Database/Commands/DeleteDatabaseCommand';
export {DeleteIndexCommand} from './Database/Commands/DeleteIndexCommand';
export {GetIndexCommand} from './Database/Commands/GetIndexCommand';
export {GetIndexesCommand} from './Database/Commands/GetIndexesCommand';
export {GetStatisticsCommand} from './Database/Commands/GetStatisticsCommand';
export {PatchByQueryCommand} from './Database/Commands/PatchByQueryCommand';
export {PatchCommand} from './Database/Commands/PatchCommand';
export {RavenCommandData} from './Database/RavenCommandData';
export {DeleteCommandData} from './Database/Commands/Data/DeleteCommandData';
export {PutCommandData} from './Database/Commands/Data/PutCommandData';
export {PatchCommandData} from './Database/Commands/Data/PatchCommandData';
export {SaveChangesData} from './Database/Commands/Data/SaveChangesData';
export {AttachmentCommand} from './Database/Commands/AttachmentCommand';
export {GetAttachmentCommand} from './Database/Commands/GetAttachmentCommand';
export {DeleteAttachmentCommand} from './Database/Commands/DeleteAttachmentCommand';
export {PutAttachmentCommand} from './Database/Commands/PutAttachmentCommand';
export {CreateDatabaseOperation} from './Database/Operations/CreateDatabaseOperation';
export {DeleteDatabaseOperation} from './Database/Operations/DeleteDatabaseOperation';
export {QueryBasedOperation} from './Database/Operations/QueryBasedOperation';
export {PatchByQueryOperation} from './Database/Operations/PatchByQueryOperation';
export {DeleteByQueryOperation} from './Database/Operations/DeleteByQueryOperation';
export {GetIndexOperation} from './Database/Operations/GetIndexOperation';
export {PutIndexesOperation} from './Database/Operations/PutIndexesOperation';
export {DeleteIndexOperation} from './Database/Operations/DeleteIndexOperation';
export {PatchOperation} from './Database/Operations/PatchOperation';
export {AttachmentOperation} from './Database/Operations/AttachmentOperation';
export {GetAttachmentOperation} from './Database/Operations/GetAttachmentOperation';
export {DeleteAttachmentOperation} from './Database/Operations/DeleteAttachmentOperation';
export {PutAttachmentOperation} from './Database/Operations/PutAttachmentOperation';
export {IAttachmentName, IAttachmentDetails} from './Database/Operations/Attachments/AttachmentDetails';
export {IAttachmentResult} from './Database/Operations/Attachments/AttachmentResult';
export {AttachmentType, AttachmentTypes} from './Database/Operations/Attachments/AttachmentType';
export {IOperationStatusResult, OperationStatus, OperationStatuses, OperationAwaiter} from './Database/Operations/OperationAwaiter';
export {AbstractOperation, Operation, AdminOperation, ServerOperation, PatchResultOperation, AwaitableOperation, IOperation} from './Database/Operations/Operation';
export {AbstractOperationExecutor, AbstractDatabaseOperationExecutor, OperationExecutor, AdminOperationExecutor, ServerOperationExecutor, IOperationExecutor} from './Database/Operations/OperationExecutor';
export {Serializer, ISerialized, IAttributeSerializer} from './Json/Serializer';
export {DatabaseDocument} from './Database/DatabaseDocument';
export {Certificate, PemCertificate, PfxCertificate, CertificateType, ICertificate} from './Auth/Certificate';
export {DocumentStore} from './Documents/DocumentStore';
export {DocumentSession} from './Documents/Session/DocumentSession';
export {AdvancedSessionOperations} from './Documents/Session/AdvancedSessionOperations';
export {IWhereParams, IParametrizedWhereParams, WhereParams} from './Documents/Session/Query/WhereParams';
export {ConditionValue, SearchOperator, SearchOperators, QueryOperator, QueryOperators, QueryKeyword, QueryKeywords, OrderingType, OrderingTypes, WhereOperator, WhereOperators, FieldConstants} from './Documents/Session/Query/QueryLanguage';
export {SpatialConstants} from './Documents/Session/Query/Spatial/SpatialConstants';
export {SpatialRelation, SpatialRelations} from './Documents/Session/Query/Spatial/SpatialRelation';
export {SpatialUnit, SpatialUnits} from './Documents/Session/Query/Spatial/SpatialUnit';
export {SpatialParameterNameGenerator, SpatialCriteria, CircleCriteria, WktCriteria} from './Documents/Session/Query/Spatial/SpatialCriteria';
export {IQueryToken, QueryToken, SimpleQueryToken} from './Documents/Session/Query/Tokens/QueryToken';
export {CloseSubclauseToken} from './Documents/Session/Query/Tokens/CloseSubclauseToken';
export {DistinctToken} from './Documents/Session/Query/Tokens/DistinctToken';
export {FieldsToFetchToken} from './Documents/Session/Query/Tokens/FieldsToFetchToken';
export {FromToken} from './Documents/Session/Query/Tokens/FromToken';
export {GroupByCountToken} from './Documents/Session/Query/Tokens/GroupByCountToken';
export {GroupByKeyToken} from './Documents/Session/Query/Tokens/GroupByKeyToken';
export {GroupBySumToken} from './Documents/Session/Query/Tokens/GroupBySumToken';
export {GroupByToken} from './Documents/Session/Query/Tokens/GroupByToken';
export {IntersectMarkerToken} from './Documents/Session/Query/Tokens/IntersectMarkerToken';
export {NegateToken} from './Documents/Session/Query/Tokens/NegateToken';
export {OpenSubclauseToken} from './Documents/Session/Query/Tokens/OpenSubclauseToken';
export {OrderByToken} from './Documents/Session/Query/Tokens/OrderByToken';
export {QueryOperatorToken} from './Documents/Session/Query/Tokens/QueryOperatorToken';
export {ShapeToken} from './Documents/Session/Query/Tokens/ShapeToken';
export {TrueToken} from './Documents/Session/Query/Tokens/TrueToken';
export {IWhereTokenOptions, WhereToken} from './Documents/Session/Query/Tokens/WhereToken';
export {DocumentConventions, IDocumentConversionResult, DocumentConstructor, IStoredRawEntityInfo, DocumentType, IDocumentInfoResolvable, IDocumentAssociationCheckResult} from './Documents/Conventions/DocumentConventions';
export {IndexDefinition} from './Database/Indexes/IndexDefinition';
export {IndexFieldOptions} from './Database/Indexes/IndexFieldOptions';
export {DocumentQueryParameters, DocumentQueryBase, RawDocumentQuery, DocumentQuery, QueryResultsWithStatistics} from './Documents/Session/DocumentQuery';
export {IndexQuery} from './Database/Indexes/IndexQuery';
export {IFieldValidationResult, QueryBuilder} from './Documents/Session/Query/QueryBuilder';
export {ServerNode} from './Http/ServerNode';
export {NodeSelector} from './Http/Request/NodeSelector';
export {NodeStatus} from './Http/NodeStatus';
export {Topology} from './Http/Topology';
export {UriUtility} from './Http/UriUtility';
export {Lock} from './Lock/Lock';
export {Observable, IObservable} from './Utility/Observable';
export {DateUtil} from './Utility/DateUtil';
export {StringUtil} from './Utility/StringUtil';
export {ArrayUtil} from './Utility/ArrayUtil';
export {TypeUtil} from './Utility/TypeUtil';
export {IStringBuilder, StringBuilder} from './Utility/StringBuilder';
export {LinkedListItem, LinkedList} from './Utility/LinkedList';
export {ExceptionsFactory} from './Utility/ExceptionsFactory';
export {RequestExecutor, ITopologyUpdateEvent, IRequestExecutorOptions, IRequestExecutor} from './Http/Request/RequestExecutor';
export {ClusterRequestExecutor} from './Http/Request/ClusterRequestExecutor';
export {PatchRequest, PatchStatus, PatchStatuses, IPatchResult, IPatchRequestOptions} from './Http/Request/PatchRequest';
export {HiloRangeValue} from './Hilo/HiloRangeValue';
export {AbstractHiloIdGenerator} from './Hilo/AbstractHiloIdGenerator';
export {HiloIdGenerator} from './Hilo/HiloIdGenerator';
export {HiloMultiDatabaseIdGenerator} from './Hilo/HiloMultiDatabaseIdGenerator';
export {HiloMultiTypeIdGenerator} from './Hilo/HiloMultiTypeIdGenerator';
export {HiloNextCommand} from './Hilo/Commands/HiloNextCommand';
export {HiloReturnCommand} from './Hilo/Commands/HiloReturnCommand';
