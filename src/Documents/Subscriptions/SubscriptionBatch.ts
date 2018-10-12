import { DocumentType } from "../DocumentAbstractions";
import {
    IDocumentSession,
    IDocumentStore,
    IMetadataDictionary,
    ISessionOptions,
    RequestExecutor
} from "../..";
import { getLogger } from "../../Utility/LogUtil";
import { GenerateEntityIdOnTheClient } from "../Identity/GenerateEntityIdOnTheClient";
import { throwError } from "../../Exceptions";
import { SubscriptionConnectionServerMessage } from "./SubscriptionConnectionServerMessage";
import * as os from "os";
import { CONSTANTS } from "../../Constants";
import { StringUtil } from "../../Utility/StringUtil";
import { createMetadataDictionary } from "../../Mapping/MetadataAsDictionary";

export class SubscriptionBatch<T extends object> {

    private readonly _documentType: DocumentType;
    private readonly _revisions: boolean;
    private readonly _requestExecutor: RequestExecutor;
    private readonly _store: IDocumentStore;
    private readonly _dbName: string;

    private readonly _logger = getLogger({ module: "SubscriptionBatch" });
    private readonly _generateEntityIdOnTheClient: GenerateEntityIdOnTheClient;
    private readonly _items = [] as Array<Item<T>>;

    public get items() {
        return this._items;
    }

    public openSession(): IDocumentSession {
        const sessionOptions = {
            database: this._dbName,
            requestExecutor: this._requestExecutor
        } as ISessionOptions;
        return this._store.openSession(sessionOptions);
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

    public initialize(batch: SubscriptionConnectionServerMessage[]): string {
        this._items.length = 0;

        let lastReceivedChangeVector: string;

        for (const item of batch) {
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
