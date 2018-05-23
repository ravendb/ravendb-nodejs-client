
import { IRavenObject } from "../../Types";
import { TypeUtil } from "../../Utility/TypeUtil";
import { throwError } from "../../Exceptions";
import { Mapping } from "../../Mapping";
import { BatchOptions } from "./Batches/BatchOptions";
// import { PatchRequest } from "../../../Http/Request/PatchRequest";

export type CommandType = 
    "NONE" 
    | "PUT"  
    | "PATCH"
    | "DELETE"
    | "ATTACHMENT_PUT"
    | "ATTACHMENT_DELETE"
    | "CLIENT_ANY_COMMAND"
    | "CLIENT_NOT_ATTACHMENT_PUT"
;

export interface ICommandData {
    id: string;
    name: string;
    changeVector: string;
    type: CommandType;

    serialize(): object;
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

    public serialize(): object {
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

    private _document: T;

    constructor(id: string, changeVector: string, document: T) {

        if (!document) {
            throwError("InvalidArgumentException", "Document cannot be null or undefined.");
        }

        this.id = id;
        this.changeVector = changeVector;
        this._document = document;
    }

    public serialize(): object {
        const toSerialize = {
            Id: this.id,
            ChangeVector: this.changeVector,
            Type: this.type,
            Document: this._document
        };

        return toSerialize;
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
