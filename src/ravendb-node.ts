// typings
export {AbstractCallback, EntityCallback, EntitiesArrayCallback, EntitiesCountCallback} from './Utility/Callbacks';
export {PromiseThenable, PromiseResolver, PromiseResolve, PromiseReject} from './Utility/PromiseResolver';
export {IDocument} from './Documents/IDocument';
export {IDocumentStore} from './Documents/IDocumentStore';
export {IDocumentSession} from './Documents/Session/IDocumentSession';
export {IDocumentQueryConditions} from './Documents/Session/IDocumentQueryConditions';
export {IDocumentQuery} from './Documents/Session/IDocumentQuery';

// classes
export {AbstractException, InvalidOperationException, ErrorResponseException, DocumentDoesNotExistsException, NonUniqueObjectException, FetchConcurrencyException, ArgumentOutOfRangeException, DatabaseDoesNotExistException} from './Database/DatabaseExceptions';
export {Serializer} from './Json/Serializer';
export {Document} from './Documents/Document';
export {DocumentStore} from './Documents/DocumentStore';
export {DocumentSession} from './Documents/Session/DocumentSession';
export {DocumentQuery} from './Documents/Session/DocumentQuery';
export {Failover, DocumentConventions} from './Documents/Conventions/DocumentConventions';
export {RequestExecutor} from './Http/RequestExecutor';

declare var uuid: Function;
declare var module: { exports: any };
