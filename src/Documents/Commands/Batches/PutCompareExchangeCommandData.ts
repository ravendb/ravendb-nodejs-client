import { ICommandData, CommandType } from "../CommandData";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
export class PutCompareExchangeCommandData implements ICommandData {
    private readonly _index: number;
    private readonly _document: object;
    public id: string;
    public changeVector: string;
    public name: string;

     public constructor(key: string, value: object, index: number) {
        this.id = key;
        this._document = value;
        this._index = index;
    }

    public get type(): CommandType {
        return "CompareExchangePUT";
    }

    public serialize(conventions: DocumentConventions): object {
        return {
            Id: this.id,
            Document: this._document,
            Index: this._index,
            Type: "CompareExchangePUT" as CommandType
        };
    }
}
