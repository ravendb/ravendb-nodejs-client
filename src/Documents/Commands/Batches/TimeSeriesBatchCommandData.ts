import { CommandType, ICommandData } from "../CommandData";
import { AppendOperation, DeleteOperation, TimeSeriesOperation } from "../../Operations/TimeSeries/TimeSeriesOperation";
import { throwError } from "../../../Exceptions";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { InMemoryDocumentSessionOperations } from "../../Session/InMemoryDocumentSessionOperations";

export class TimeSeriesBatchCommandData implements ICommandData {
    private _id: string;
    private _name: string;
    private _timeSeries: TimeSeriesOperation;

    public constructor(documentId: string, name: string, appends: AppendOperation[], deletes: DeleteOperation[]) {
        if (!documentId) {
            throwError("InvalidArgumentException", "DocumentId cannot be null");
        }

        if (!name) {
            throwError("InvalidArgumentException", "Name cannot be null");
        }

        this._id = documentId;
        this._name = name;

        this._timeSeries = new TimeSeriesOperation();
        this._timeSeries.name = name;

        if (appends) {
            for (const appendOperation of appends) {
                this._timeSeries.append(appendOperation);
            }
        }

        if (deletes) {
            for (const deleteOperation of deletes) {
                this._timeSeries.delete(deleteOperation);
            }
        }
    }

    public get id(): string {
        return this._id;
    }

    public set id(value: string) {
        this._id = value;
    }

    public get name(): string {
        return this._name;
    }

    public set name(value: string) {
        this._name = value;
    }

    public get changeVector() {
        return null;
    }

    public get type(): CommandType {
        return "TimeSeries";
    }

    public get timeSeries(): TimeSeriesOperation {
        return this._timeSeries;
    }

    serialize(conventions: DocumentConventions): object {
        return {
            Id: this._id,
            TimeSeries: this._timeSeries.serialize(conventions),
            Type: "TimeSeries"
        }
    }

    onBeforeSaveChanges(session: InMemoryDocumentSessionOperations) {
        // empty by design
    }
}
