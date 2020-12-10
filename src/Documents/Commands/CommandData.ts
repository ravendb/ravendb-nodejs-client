import { throwError } from "../../Exceptions";
import { BatchOptions } from "./Batches/BatchOptions";
import { InMemoryDocumentSessionOperations } from "../Session/InMemoryDocumentSessionOperations";
import { DocumentConventions } from "../Conventions/DocumentConventions";
import { DocumentInfo } from "../Session/DocumentInfo";
import { ForceRevisionStrategy } from "../Session/ForceRevisionStrategy";

export type CommandType =
    "None"
    | "PUT"
    | "PATCH"
    | "DELETE"
    | "AttachmentPUT"
    | "AttachmentDELETE"
    | "AttachmentMOVE"
    | "AttachmentCOPY"
    | "CompareExchangePUT"
    | "CompareExchangeDELETE"
    | "Counters"
    | "ClientAnyCommand"
    | "ClientModifyDocumentCommand"
    | "BatchPATCH"
    | "ForceRevisionCreation"
    | "TimeSeries"
    | "TimeSeriesBulkInsert"
    | "TimeSeriesCopy"
    ;

export interface ICommandData {
    id: string;
    name: string;
    changeVector: string;
    type: CommandType;

    serialize(conventions: DocumentConventions): object;

    onBeforeSaveChanges?: (session: InMemoryDocumentSessionOperations) => void;
}

export class DeleteCommandData implements ICommandData {

    public id: string;
    public name: string;
    public changeVector: string;

    public get type(): CommandType {
        return "DELETE";
    }

    constructor(id: string, changeVector?: string) {
        this.id = id;
        if (!id) {
            throwError("InvalidArgumentException", "Id cannot be null or undefined.");
        }

        this.changeVector = changeVector;
    }

    public serialize(conventions: DocumentConventions): object {
        const result = {
            Id: this.id,
            ChangeVector: this.changeVector,
            Type: "DELETE"
        };

        this._serializeExtraFields(result);

        return result;
    }

    // tslint:disable-next-line:no-empty
    protected _serializeExtraFields(resultingObject: object) {}
}

export class PutCommandDataBase<T extends object> implements ICommandData {

    public get type(): CommandType {
        return "PUT";
    }

    public id: string;
    public name: string = null;
    public changeVector: string;
    public forceRevisionCreationStrategy: ForceRevisionStrategy;

    private readonly _document: T;

    constructor(id: string, changeVector: string, document: T, strategy: ForceRevisionStrategy = "None") {

        if (!document) {
            throwError("InvalidArgumentException", "Document cannot be null or undefined.");
        }

        this.id = id;
        this.changeVector = changeVector;
        this._document = document;
        this.forceRevisionCreationStrategy = strategy;
    }

    public serialize(conventions: DocumentConventions): object {
        const result = {
            Id: this.id,
            ChangeVector: this.changeVector,
            Document: this._document,
            Type: "PUT"
        };

        if (this.forceRevisionCreationStrategy !== "None") {
            result["ForceRevisionCreationStrategy"] = this.forceRevisionCreationStrategy;
        }

        return result;
    }
}

export class PutCommandDataWithJson extends PutCommandDataBase<object> {

    public constructor(id: string, changeVector: string, document: object, strategy: ForceRevisionStrategy) {
        super(id, changeVector, document, strategy);
    }
}

export class SaveChangesData {
    public deferredCommands: ICommandData[];
    public deferredCommandsMap: Map<string, ICommandData>;
    public sessionCommands: ICommandData[] = [];
    public entities: object[] = [];
    public options: BatchOptions;
    public onSuccess: ActionsToRunOnSuccess;

    public constructor(args: {
        deferredCommands: ICommandData[],
        deferredCommandsMap: Map<string, ICommandData>,
        options: BatchOptions,
        session: InMemoryDocumentSessionOperations
    }) {
        this.deferredCommands = args.deferredCommands;
        this.deferredCommandsMap = args.deferredCommandsMap;
        this.options = args.options;
        this.onSuccess = new ActionsToRunOnSuccess(args.session);
    }
}

export class ActionsToRunOnSuccess {

    private readonly _session: InMemoryDocumentSessionOperations;
    private readonly _documentsByIdToRemove: string[] = [];
    private readonly _documentsByEntityToRemove: object[] = [];
    private readonly _documentInfosToUpdate: [DocumentInfo, object][] = [];

    private _clearDeletedEntities: boolean;

    public constructor(session: InMemoryDocumentSessionOperations) {
        this._session = session;
    }

    public removeDocumentById(id: string) {
        this._documentsByIdToRemove.push(id);
    }

    public removeDocumentByEntity(entity: object) {
        this._documentsByEntityToRemove.push(entity);
    }

    public updateEntityDocumentInfo(documentInfo: DocumentInfo, document: object) {
        this._documentInfosToUpdate.push([documentInfo, document]);
    }

    public clearSessionStateAfterSuccessfulSaveChanges() {
        for (const id of this._documentsByIdToRemove) {
            this._session.documentsById.remove(id);
        }

        for (const entity of this._documentsByEntityToRemove) {
            this._session.documentsByEntity.remove(entity);
        }

        for (const [info, document] of this._documentInfosToUpdate) {
            info.newDocument = false;
            info.document = document;
        }

        if (this._clearDeletedEntities) {
            this._session.deletedEntities.clear();
        }

        this._session.deferredCommands.length = 0;
        this._session.deferredCommandsMap.clear();
    }

    public clearDeletedEntities() {
        this._clearDeletedEntities = true;
    }
}