import { IDocumentStore } from "../IDocumentStore.js";
import { SubscriptionBatchBase } from "./SubscriptionBatchBase.js";
import { GenerateEntityIdOnTheClient } from "../Identity/GenerateEntityIdOnTheClient.js";
import { IDocumentSession } from "../Session/IDocumentSession.js";
import { SessionOptions } from "../Session/SessionOptions.js";
import { DocumentType } from "../DocumentAbstractions.js";
import { RequestExecutor } from "../../Http/RequestExecutor.js";
import { InMemoryDocumentSessionOperations } from "../Session/InMemoryDocumentSessionOperations.js";
import { throwError } from "../../Exceptions/index.js";
import { BatchFromServer } from "./BatchFromServer.js";
import { DocumentInfo } from "../Session/DocumentInfo.js";

export class SubscriptionBatch<T extends object> extends SubscriptionBatchBase<T> {
    private readonly _store: IDocumentStore;
    private readonly _generateEntityIdOnTheClient: GenerateEntityIdOnTheClient;

    private _sessionOpened = false;

    public constructor(documentType: DocumentType, revisions: boolean, requestExecutor: RequestExecutor,
                       store: IDocumentStore, dbName: string) {
        super(documentType, revisions, requestExecutor, dbName)
        this._store = store;

        this._generateEntityIdOnTheClient = new GenerateEntityIdOnTheClient(this._requestExecutor.conventions,
            () => throwError("InvalidOperationException", "Shouldn't be generating new ids here"));
    }

    initialize(batch: BatchFromServer): void {
        this._sessionOpened = false;

        super.initialize(batch);
    }

    public openSession(): IDocumentSession;
    public openSession(options: SessionOptions): IDocumentSession;
    public openSession(options?: SessionOptions): IDocumentSession {
        if (options) {
            SubscriptionBatch._validateSessionOptions(options);
        }

        options = options || {} as SessionOptions;
        options.database = this._dbName;
        options.requestExecutor = this._requestExecutor;

        return this._openSessionInternal(options);
    }

    private _openSessionInternal(options: SessionOptions): IDocumentSession {
        if (this._sessionOpened) {
            this.throwSessionCanBeOpenedOnlyOnce();
        }
        this._sessionOpened = true;
        const s = this._store.openSession(options);
        this._loadDataToSession(s as any as InMemoryDocumentSessionOperations);
        return s;
    }

    private throwSessionCanBeOpenedOnlyOnce(): void {
        throwError("InvalidOperationException", "Session can only be opened once per each Subscription batch");
    }

    private static _validateSessionOptions(options: SessionOptions): void {
        if (options.database) {
            throwError(
                "InvalidOperationException", "Cannot set Database when session is opened in subscription.");
        }

        if (options.requestExecutor) {
            throwError(
                "InvalidOperationException", "Cannot set RequestExecutor when session is opened in subscription.");
        }

        if (options.transactionMode !== "SingleNode") {
            throwError(
                "InvalidOperationException",
                "Cannot set TransactionMode when session is opened in subscription. Only 'SingleNode' is supported.");
        }
    }

    private _loadDataToSession(session: InMemoryDocumentSessionOperations): void {
        if (session.noTracking) {
            return;
        }

        if (this._includes && this._includes.length) {
            for (const item of this._includes) {
                session.registerIncludes(item, true);
            }
        }

        if (this._counterIncludes && this._counterIncludes.length) {
            for (const item of this._counterIncludes) {
                session.registerCounters(item.includes, item.counterIncludes);
            }
        }

        if (this._timeSeriesIncludes && this._timeSeriesIncludes.length > 0) {
            for (const item of this._timeSeriesIncludes) {
                session.registerTimeSeries(item);
            }
        }

        for (const item of this.items) {
            if (item.projection || item.revision) {
                continue;
            }
            const documentInfo = new DocumentInfo();
            documentInfo.id = item.id;
            documentInfo.document = item.rawResult;
            documentInfo.metadata = item.rawMetadata;
            documentInfo.metadataInstance = item.metadata;
            documentInfo.changeVector = item.changeVector;
            documentInfo.entity = item.result;
            documentInfo.newDocument = false;
            session.registerExternalLoadedIntoTheSession(documentInfo);
        }
    }

    protected ensureDocumentId(item: T, id: string) {
        this._generateEntityIdOnTheClient.trySetIdentity(item, id);
    }
}
