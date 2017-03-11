// typings
export {AbstractCallback, EntityCallback, EntitiesArrayCallback, EntitiesCountCallback} from './Utility/Callbacks';
export {IDocument} from './Documents/IDocument';
export {IDocumentStore} from './Documents/IDocumentStore';
export {IDocumentSession} from './Documents/Session/IDocumentSession';
export {IDocumentQueryConditions} from './Documents/Session/IDocumentQueryConditions';
export {IDocumentQuery} from './Documents/Session/IDocumentQuery';

// classes
export {Serializer} from './Json/Serializer';
export {Document} from './Documents/Document';
export {DocumentStore} from './Documents/DocumentStore';
export {DocumentSession} from './Documents/Session/DocumentSession';
export {DocumentQuery} from './Documents/Session/DocumentQuery';
export {DocumentConventions} from './Documents/Conventions/DocumentConventions';
export {RequestExecutor} from './Http/RequestExecutor';

declare var module: { exports: any };
