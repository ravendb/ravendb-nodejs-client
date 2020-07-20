import { ICommandData } from "../Commands/CommandData";
import { InMemoryDocumentSessionOperations } from "./InMemoryDocumentSessionOperations";
import { RequestExecutor } from "../../Http/RequestExecutor";
import { SessionInfo } from "./IDocumentSession";
import { IDocumentStore } from "../IDocumentStore";
import { DocumentsById } from "./DocumentsById";

export abstract class AdvancedSessionExtensionBase {
    protected _session: InMemoryDocumentSessionOperations;
    protected _requestExecutor: RequestExecutor;
    protected _sessionInfo: SessionInfo;
    protected _documentStore: IDocumentStore;

    // keys are produced with CommandIdTypeAndName.keyFor() method
    protected _deferredCommandsMap: Map<string, ICommandData>;
    protected _documentsById: DocumentsById;

    protected constructor(session: InMemoryDocumentSessionOperations) {
        this._session = session;
        this._requestExecutor = session.requestExecutor;
        this._sessionInfo = session.sessionInfo;
        this._documentStore = session.documentStore;
        this._deferredCommandsMap = session.deferredCommandsMap;
        this._documentsById = session.documentsById;
    }

    public defer(command: ICommandData, ...commands: ICommandData[]): void {
        this._session.defer(command, ...commands);
    }
}