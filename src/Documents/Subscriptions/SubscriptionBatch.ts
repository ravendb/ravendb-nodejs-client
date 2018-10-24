import { DocumentType } from "../DocumentAbstractions";
import { getLogger } from "../../Utility/LogUtil";
import { GenerateEntityIdOnTheClient } from "../Identity/GenerateEntityIdOnTheClient";
import { throwError } from "../../Exceptions";
import { SubscriptionConnectionServerMessage } from "./SubscriptionConnectionServerMessage";
import * as os from "os";
import { CONSTANTS } from "../../Constants";
import { StringUtil } from "../../Utility/StringUtil";
import { createMetadataDictionary } from "../../Mapping/MetadataAsDictionary";
import { RequestExecutor } from "../../Http/RequestExecutor";
import { IDocumentStore } from "../IDocumentStore";
import { IDocumentSession } from "../Session/IDocumentSession";
import { SessionOptions } from "../Session/SessionOptions";
import { InMemoryDocumentSessionOperations } from "../Session/InMemoryDocumentSessionOperations";
import { DocumentInfo } from "../Session/DocumentInfo";
import { BatchFromServer } from "./BatchFromServer";
import { IMetadataDictionary } from "../Session/IMetadataDictionary";

export class SubscriptionBatch<T extends object> {

    private readonly _documentType: DocumentType;
    private readonly _revisions: boolean;
    private readonly _requestExecutor: RequestExecutor;
    private readonly _store: IDocumentStore;
    private readonly _dbName: string;

    private readonly _logger = getLogger({ module: "SubscriptionBatch" });
    private readonly _generateEntityIdOnTheClient: GenerateEntityIdOnTheClient;
    private readonly _items = [] as Array<Item<T>>;

    private _includes: object[];

    public get items() {
        return this._items;
    }

    // public openSession(): IDocumentSession {
    //     const sessionOptions = {
    //         database: this._dbName,
    //         requestExecutor: this._requestExecutor
    //     } as SessionOptions;
    //     return this._store.openSession(sessionOptions);
    // }

    public openSession(options: SessionOptions): IDocumentSession {
        SubscriptionBatch._validateSessionOptions(options);
        options.database = this._dbName;
        options.requestExecutor = this._requestExecutor;
        return this._openSessionInternal(options);
    }

    private _openSessionInternal(options: SessionOptions): IDocumentSession {
        const s = this._store.openSession(options);
        this._loadDataToSession(s as any as InMemoryDocumentSessionOperations);
        return s;
    }

    public getNumberOfItemsInBatch() {
        return this._items ? this._items.length : 0;
    }

    public constructor(documentType: DocumentType, revisions: boolean, requestExecutor: RequestExecutor,
                       store: IDocumentStore, dbName: string) {
        this._documentType = documentType;
        this._revisions = revisions;
        this._requestExecutor = requestExecutor;
        this._store = store;
        this._dbName = dbName;

        this._generateEntityIdOnTheClient = new GenerateEntityIdOnTheClient(this._requestExecutor.conventions,
            () => throwError("InvalidOperationException", "Shouldn't be generating new ids here"));
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

        if (!this._includes) {
            return;
        }
         
        for (const item of this._includes) {
            session.registerIncludes(item);
        }

        for (const item of this._items) {
            const documentInfo = new DocumentInfo();
            documentInfo.id = item.id;
            documentInfo.document = item.rawResult;
            documentInfo.metadata = item.rawMetadata;
            documentInfo.changeVector = item.changeVector;
            documentInfo.entity = item.result;
            documentInfo.newDocument = false;
            session.registerExternalLoadedIntoTheSession(documentInfo);
        }
     }

    public initialize(batch: BatchFromServer): string {
        this._items.length = 0;

        let lastReceivedChangeVector: string;
        this._includes = batch.includes;

        for (const item of batch.messages) {
            const curDoc = item.data;
            const metadata = curDoc[CONSTANTS.Documents.Metadata.KEY];
            if (!metadata) {
                SubscriptionBatch._throwRequired("@metadata field");
            }
            const id = metadata[CONSTANTS.Documents.Metadata.ID];

            if (!id) {
                SubscriptionBatch._throwRequired("@id field");
            }

            const changeVector: string = metadata[CONSTANTS.Documents.Metadata.CHANGE_VECTOR];
            if (!changeVector) {
                SubscriptionBatch._throwRequired("@change-vector field");
            }

            lastReceivedChangeVector = changeVector;

            this._logger.info("Got " + id + " (change vector: [" + lastReceivedChangeVector + "]");

            let instance: T = null;

            if (!item.exception) {
                instance = curDoc;
                //TODO: make sure above assignment is correct when entities has custom casing

                if (!StringUtil.isNullOrEmpty(id)) {
                    this._generateEntityIdOnTheClient.trySetIdentity(instance, id);
                }

                // TODO: check if something's missing here
                // tslint:disable-next-line:max-line-length
                // https://github.com/ravendb/ravendb-jvm-client/blob/v4.1/src/main/java/net/ravendb/client/documents/subscriptions/SubscriptionBatch.java#L222
            }

            const itemToAdd = new Item<T>();
            itemToAdd.changeVector = changeVector;
            itemToAdd.id = id;
            itemToAdd.rawResult = curDoc;
            itemToAdd.rawMetadata = metadata;
            itemToAdd.result = instance;
            itemToAdd.exceptionMessage = item.exception;

            this._items.push(itemToAdd);
        }

        return lastReceivedChangeVector;
    }

    private static _throwRequired(name: string) {
        throwError("InvalidOperationException", "Document must have a " + name);
    }
}

/**
 * Represents a single item in a subscription batch results.
 */
export class Item<T> {

    private _result: T;
    public exceptionMessage: string;
    public id: string;
    public changeVector: string;

    private _throwItemProcessError() {
        throwError("InvalidOperationException",
            "Failed to process document " + this.id + " with Change Vector "
            + this.changeVector + " because: " + os.EOL + this.exceptionMessage);
    }

    public get result() {
        if (this.exceptionMessage) {
            this._throwItemProcessError();
        }

        return this._result;
    }

    public set result(result: T) {
        this._result = result;
    }

    public rawResult: any;
    public rawMetadata: any;

    private _metadata: IMetadataDictionary;

    public get metadata() {
        if (!this._metadata) {
            this._metadata = createMetadataDictionary({ raw: this.rawMetadata });
        }

        return this._metadata;
    }
}
