
import * as _ from "lodash";
import { IJsonable } from "../../Types/Contracts";
import { IRavenObject } from "../../Types";
import { TypeUtil } from "../../Utility/TypeUtil";
import { throwError } from "../../Exceptions";
import { stringifyJson } from "../../Utility/JsonUtil";
import { Mapping } from "../../Utility/Mapping";
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

export class CommandIdTypeAndName {
    public keyFor(id: string, type: CommandType, name: string) {
        return `${id}.${type}.${name}`;
    }
}
export interface ICommandData {
    id: string;
    name: string;
    changeVector: string;
    type: CommandType;
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

    public serialize(): string {
        const toSerialize = {
            Id: this.id,
            ChangeVector: this.changeVector,
            Type: this.type
        };

        this._serializeExtraFields(toSerialize);

        return Mapping.getDefaultMapper().serialize(toSerialize);
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

    private document: T;

    constructor(id: string, changeVector: string, document: T) {

        if (!id) {
            throwError("InvalidArgumentException", "Id cannot be null or undefined.");
        }

        this.id = id;
        this.changeVector = changeVector;
        this.document = document;
    }

    public serialize(): string {
        const toSerialize = {
            Id: this.id,
            ChangeVector: this.changeVector,
            Type: this.type,
            Document: this.document
        };

        return Mapping.getDefaultMapper().serialize(toSerialize);
    }

    // public toJson(): object {
    //     let document: object = this.document;

    //     if (this.metadata) {
    //         document['@metadata'] = this.metadata;
    //     }

    //     return _.assign(super.toJson(), {
    //         Document: document
    //     });
    // }
}

export class PutCommandDataWithJson extends PutCommandDataBase<object> {

    public constructor(id: string, changeVector: string, document: object) {
        super(id, changeVector, document);
    }
}

export class SaveChangesData {
    protected commands: CommandData[];
    protected deferredCommandCount: number;
    protected documents: IRavenObject[];

    public get deferredCommandsCount(): number {
        return this.deferredCommandCount;
    }

    public get commandsCount(): number {
        return this.commands.length;
    }

    constructor(commands?: CommandData[], deferredCommandCount: number = 0, documents?: IRavenObject[]) {
        this.commands = commands || [];
        this.documents = documents || [];
        this.deferredCommandCount = deferredCommandCount;
    }

    public addCommand(command: CommandData) {
        this.commands.push(command);
    }

    public addDocument(document: IRavenObject) {
        this.documents.push(document);
    }

    public getDocument(index: number): IRavenObject {
        return this.documents[index];
    }

    // public createBatchCommand(): BatchCommand {
    //     return new BatchCommand(this.commands);
    // }
}