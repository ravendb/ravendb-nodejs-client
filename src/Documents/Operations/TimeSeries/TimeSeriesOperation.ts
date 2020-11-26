import { DateUtil } from "../../../Utility/DateUtil";
import { DocumentConventions } from "../../Conventions/DocumentConventions";

export class TimeSeriesOperation {
    private _appends: AppendOperation[];
    private _deletes: DeleteOperation[];
    name: string;

    public constructor()
    public constructor(name: string)
    public constructor(name?: string) {
        this.name = name;
    }

    public serialize(conventions: DocumentConventions): object {
        const sortedAppends = this._appends ?
            this._appends
                .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
                .map(x => x.serialize(conventions))
            : null;

        return {
            Name: this.name,
            Appends: sortedAppends,
            Deletes: this._deletes ? this._deletes.map(x => x.serialize(conventions)) : null
        }
    }

    public append(appendOperation: AppendOperation): void {
        if (!this._appends) {
            this._appends = [];
        }

        const existingItemIdx = this._appends.findIndex(x => x.timestamp.getTime() === appendOperation.timestamp.getTime());
        if (existingItemIdx !== -1) {
            this._appends.splice(existingItemIdx, 1);
        }

        this._appends.push(appendOperation);
    }

    public delete(deleteOperation: DeleteOperation) {
        if (!this._deletes) {
            this._deletes = [];
        }

        this._deletes.push(deleteOperation);
    }

}

export class AppendOperation {
    public timestamp: Date;
    public values: number[];
    public tag: string;

    public constructor(timestamp: Date, values: number[]);
    public constructor(timestamp: Date, values: number[], tag: string);
    public constructor(timestamp: Date, values: number[], tag?: string) {
        this.timestamp = timestamp;
        this.values = values;
        this.tag = tag;
    }

    public serialize(conventions: DocumentConventions): object {
        return {
            Timestamp: DateUtil.utc.stringify(this.timestamp),
            Values: this.values,
            Tag: this.tag || undefined
        };
    }
}

export class DeleteOperation {
    public from: Date;
    public to: Date;

    public constructor();
    public constructor(from: Date, to: Date);
    public constructor(from?: Date, to?: Date) {
        this.from = from;
        this.to = to;
    }

    public serialize(conventions: DocumentConventions): object {
        return {
            From: this.from ? DateUtil.utc.stringify(this.from) : null,
            To : this.to ? DateUtil.utc.stringify(this.to) : null
        };
    }
}
