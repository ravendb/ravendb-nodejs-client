import { CommandType, ICommandData } from "../CommandData";
import { TimeSeriesOperation } from "../../Operations/TimeSeries/TimeSeriesOperation";
import { throwError } from "../../../Exceptions";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { InMemoryDocumentSessionOperations } from "../../Session/InMemoryDocumentSessionOperations";


export abstract class TimeSeriesCommandData implements ICommandData {
    private _id: string;
    private _name: string;
    private _timeSeries: TimeSeriesOperation;

    public constructor(documentId: string, name: string) {
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

    public abstract get type(): CommandType;

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
