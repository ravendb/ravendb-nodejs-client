import {throwError} from "../../Exceptions";
import {BatchOptions} from "./Batches/BatchOptions";
import {DocumentConventions} from "../..";

export type CommandType =
    "None"
    | "PUT"
    | "PATCH"
    | "DELETE"
    | "AttachmentPUT"
    | "AttachmentDELETE"
    | "ClientAnyCommand"
    | "ClientNotAttachment"
    ;

export interface ICommandData {
    id: string;
    name: string;
    changeVector: string;
    type: CommandType;

    serialize(conventions: DocumentConventions): object;
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
            Type: this.type
        };

        this._serializeExtraFields(result);

        return result;
    }

    // tslint:disable-next-line:no-empty
    protected _serializeExtraFields(resultingObject: object) {
    }
}

export class PutCommandDataBase<T extends object> implements ICommandData {

    public get type(): CommandType {
        return "PUT";
    }

    public id: string;
    public name: string = null;
    public changeVector: string;

    private readonly _document: T;

    constructor(id: string, changeVector: string, document: T) {

        if (!document) {
            throwError("InvalidArgumentException", "Document cannot be null or undefined.");
        }

        this.id = id;
        this.changeVector = changeVector;
        this._document = document;
    }

    public serialize(conventions: DocumentConventions): object {
        return {
            Id: this.id,
            ChangeVector: this.changeVector,
            Type: this.type,
            Document: this._document
        };
    }
}

export class PutCommandDataWithJson extends PutCommandDataBase<object> {

    public constructor(id: string, changeVector: string, document: object) {
        super(id, changeVector, document);
    }
}

export class SaveChangesData {
    public deferredCommands: ICommandData[];
    public deferredCommandsMap: Map<string, ICommandData>;
    public sessionCommands: ICommandData[] = [];
    public entities: object[] = [];
    public options: BatchOptions;

    public constructor(args: {
        deferredCommands: ICommandData[],
        deferredCommandsMap: Map<string, ICommandData>,
        options: BatchOptions
    }) {
        this.deferredCommands = args.deferredCommands;
        this.deferredCommandsMap = args.deferredCommandsMap;
        this.options = args.options;
    }
}
