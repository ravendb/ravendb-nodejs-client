import { DateUtil } from "../../../Utility/DateUtil";
import { DocumentConventions } from "../../Conventions/DocumentConventions";

export class TimeSeriesOperation {
    private _appends: Map<number, AppendOperation>; // using map in node - for performance
    private _deletes: DeleteOperation[];
    private _increments: Map<number, IncrementOperation>;
    name: string;

    public constructor()
    public constructor(name: string)
    public constructor(name?: string) {
        this.name = name;
    }

    public serialize(conventions: DocumentConventions): object {
        const sortedAppends = this._appends ?
            Array.from(this._appends.values())
                .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
                .map(x => x.serialize(conventions))
            : null;

        return {
            Name: this.name,
            Appends: sortedAppends,
            Deletes: this._deletes ? this._deletes.map(x => x.serialize(conventions)) : null,
            Increments: this._increments ? Array.from(this._increments.values()).map(x => x.serialize(conventions)) : null
        }
    }

    public increment(incrementOperation: IncrementOperation) {
        if (!this._increments) {
            this._increments = new Map<number, IncrementOperation>();
        }

        const time = incrementOperation.timestamp.getTime();
        if (this._increments.has(time)) {
            this._increments.delete(time);
        }

        this._increments.set(time, incrementOperation);
    }

    public append(appendOperation: AppendOperation): void {
        if (!this._appends) {
            this._appends = new Map<number, AppendOperation>();
        }

        const time = appendOperation.timestamp.getTime();
        if (this._appends.has(time)) {
            this._appends.delete(time);
        }

        this._appends.set(time, appendOperation);
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

export class IncrementOperation {
    public timestamp: Date;
    public values: number[];

    public serialize(conventions: DocumentConventions): object {
        return {
            Timestamp: this.timestamp ? DateUtil.utc.stringify(this.timestamp) : null,
            Values: this.values
        }
    }
}
