// typings
export {AbstractCallback, IDCallback, EntityCallback, EntitiesArrayCallback, EntitiesCountCallback} from './Utility/Callbacks';
export {PromiseThenable, PromiseResolver, PromiseResolve, PromiseReject} from './Utility/PromiseResolver';
export {DocumentID, IDocument} from './Documents/IDocument';
export {IDocumentStore} from './Documents/IDocumentStore';
export {IDocumentSession} from './Documents/Session/IDocumentSession';
export {IDocumentQueryConditions} from './Documents/Session/IDocumentQueryConditions';
export {IDocumentQuery} from './Documents/Session/IDocumentQuery';
export {IHiloKeyGenerator, IHiloKeyGeneratorsCollection} from './Hilo/IHiloKeyGenerator';

// classes
export {AbstractException, InvalidOperationException, ErrorResponseException, DocumentDoesNotExistsException, NonUniqueObjectException, FetchConcurrencyException, ArgumentOutOfRangeException, DatabaseDoesNotExistException} from './Database/DatabaseExceptions';
export {RavenCommand} from './Database/RavenCommand';
export {Serializer} from './Json/Serializer';
export {Document} from './Documents/Document';
export {DocumentStore} from './Documents/DocumentStore';
export {DocumentSession} from './Documents/Session/DocumentSession';
export {DocumentQuery} from './Documents/Session/DocumentQuery';
export {Failover, DocumentConventions} from './Documents/Conventions/DocumentConventions';
export {ServerNode} from './Http/ServerNode';
export {RequestMethods, RequestMethod, RequestsExecutor} from './Http/RequestsExecutor';
export {HiloRangeValue} from './Hilo/HiloRangeValue';
export {AbstractHiloKeyGenerator} from './Hilo/AbstractHiloKeyGenerator';
export {HiloKeyGenerator} from './Hilo/HiloKeyGenerator';
export {HiloMultiDatabaseKeyGenerator} from './Hilo/HiloMultiDatabaseKeyGenerator';
export {HiloMultiTypeKeyGenerator} from './Hilo/HiloMultiTypeKeyGenerator';
export {HiloNextCommand} from './Hilo/Commands/HiloNextCommand';
export {HiloReturnCommand} from './Hilo/Commands/HiloReturnCommand';

declare var uuid: Function;
declare var module: { exports: any };
declare class AsyncLock{ acquire: any };
