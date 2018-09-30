import { DocumentsById } from "./DocumentsById";
import { DocumentInfo } from "./DocumentInfo";
import { InMemoryDocumentSessionOperations } from "./InMemoryDocumentSessionOperations";
import { RequestExecutor } from "../../Http/RequestExecutor";
import { SessionInfo } from "./IDocumentSession";
import { IDocumentStore } from "../IDocumentStore";
import { ICommandData } from "../Commands/CommandData";

export abstract class AdvancedSessionExtensionBase {

    protected _documentsById: DocumentsById;

    protected _includedDocumentsById: Map<string, DocumentInfo>;

    protected _documentsByEntity: Map<object, DocumentInfo>;

    protected _documentStore: IDocumentStore;

    protected _requestExecutor: RequestExecutor;

    protected _sessionInfo: SessionInfo;

    // keys are produced with CommandIdTypeAndName.keyFor() method
    protected _deferredCommandsMap: Map<string, ICommandData>;

    protected _session: InMemoryDocumentSessionOperations;

    protected _deletedEntities: Set<object>;

    protected constructor(session: InMemoryDocumentSessionOperations) {
        this._session = session;
        this._documentsByEntity = session.documentsByEntity;
        this._requestExecutor = session.requestExecutor;
        this._sessionInfo = session.sessionInfo;
        this._documentStore = session.documentStore;
        this._deferredCommandsMap = session.deferredCommandsMap;
        this._deletedEntities = session.deletedEntities;
        this._documentsById = session.documentsById;
    }
    public defer(command: ICommandData, ...commands: ICommandData[]): void {
        this._session.defer(command, ...commands);
    }
}
