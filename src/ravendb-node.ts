// typings
export {AbstractCallback, EntityKeyCallback, EntityCallback, EntitiesArrayCallback, EntitiesCountCallback} from './Utility/Callbacks';
export {PromiseThenable, PromiseResolver, PromiseResolve, PromiseReject} from './Utility/PromiseResolver';
export {DocumentID, DocumentKey, IDocument} from './Documents/IDocument';
export {IDocumentStore} from './Documents/IDocumentStore';
export {IDocumentSession} from './Documents/Session/IDocumentSession';
export {IDocumentQueryConditions} from './Documents/Session/IDocumentQueryConditions';
export {IDocumentQuery} from './Documents/Session/IDocumentQuery';
export {IHiloLockDoneCallback, IHiloKeyGenerator, IHiloKeyGeneratorsCollection} from './Hilo/IHiloKeyGenerator';
export {RequestMethods, RequestMethod} from './Http/RequestMethod';
export {QueryOperators, QueryOperator} from './Database/Operations/QueryOperator';
export {FieldIndexingOption, FieldIndexingOptions} from './Database/Indexes/FieldIndexingOption';
export {IndexLockMode} from './Database/Indexes/IndexLockMode';
export {SortOption, SortOptions} from './Database/Indexes/SortOption';
export {ReadBehavior, ReadBehaviors} from './Documents/Conventions/ReadBehavior';
export {WriteBehavior, WriteBehaviors} from './Documents/Conventions/WriteBehavior';
export {IMetadata, Metadata} from './Database/Metadata';

// classes
export {AbstractException, InvalidOperationException, ErrorResponseException, DocumentDoesNotExistsException, NonUniqueObjectException, FetchConcurrencyException, ArgumentOutOfRangeException, DatabaseDoesNotExistException} from './Database/DatabaseExceptions';
export {RavenCommand} from './Database/RavenCommand';
export {Serializer} from './Json/Serializer';
export {Document} from './Documents/Document';
export {DocumentStore} from './Documents/DocumentStore';
export {DocumentSession} from './Documents/Session/DocumentSession';
export {DocumentQuery} from './Documents/Session/DocumentQuery';
export {DocumentConventions} from './Documents/Conventions/DocumentConventions';
export {ServerNode} from './Http/ServerNode';
export {RequestsExecutor} from './Http/RequestsExecutor';
export {HiloRangeValue} from './Hilo/HiloRangeValue';
export {AbstractHiloKeyGenerator} from './Hilo/AbstractHiloKeyGenerator';
export {HiloKeyGenerator} from './Hilo/HiloKeyGenerator';
export {HiloMultiDatabaseKeyGenerator} from './Hilo/HiloMultiDatabaseKeyGenerator';
export {HiloMultiTypeKeyGenerator} from './Hilo/HiloMultiTypeKeyGenerator';
export {HiloNextCommand} from './Hilo/Commands/HiloNextCommand';
export {HiloReturnCommand} from './Hilo/Commands/HiloReturnCommand';

declare var uuid: Function;
declare var moment: Function;
declare var module: { exports: any };
declare class AsyncLock{ acquire: any };