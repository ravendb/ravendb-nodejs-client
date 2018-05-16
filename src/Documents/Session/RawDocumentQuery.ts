import {AbstractDocumentQuery} from "./AbstractDocumentQuery";
import { IRawDocumentQuery } from "../Session/IRawDocumentQuery";
import { InMemoryDocumentSessionOperations } from "./InMemoryDocumentSessionOperations";
import { DocumentType } from "../DocumentAbstractions";
import { QueryOperator } from "../Queries/QueryOperator";
import { QueryStatistics } from "./QueryStatistics";

export class RawDocumentQuery<T> extends AbstractDocumentQuery<T, RawDocumentQuery<T>> implements IRawDocumentQuery<T> {

    public constructor(session: InMemoryDocumentSessionOperations, rawQuery: string, clazz?: DocumentType<T>) {
        super(clazz, session, null, null, false, null, null, null);
        this._queryRaw = rawQuery;
    }

    public skip(count: number): IRawDocumentQuery<T> {
        this._skip(count);
        return this;
    }

    public take(count: number): IRawDocumentQuery<T> {
        this._take(count);
        return this;
    }

    public waitForNonStaleResults(): IRawDocumentQuery<T>;
    public waitForNonStaleResults(waitTimeout?: number): IRawDocumentQuery<T>;
    public waitForNonStaleResults(waitTimeout?: number): IRawDocumentQuery<T>  {
        this._waitForNonStaleResults(waitTimeout || null);
        return this;
    }

    // TBD public IRawDocumentQuery<T> showTimings() {

    public noTracking(): IRawDocumentQuery<T> {
        this._noTracking();
        return this;
    }

    public noCaching(): IRawDocumentQuery<T> {
        this._noCaching();
        return this;
    }

    public usingDefaultOperator(queryOperator: QueryOperator): IRawDocumentQuery<T> {
        this._usingDefaultOperator(queryOperator);
        return this;
    }

    public statistics(statsCallback: (stats: QueryStatistics) => void): IRawDocumentQuery<T> {
        this._statistics(statsCallback);
        return this;
    }

    public addParameter(name: string, value: object): IRawDocumentQuery<T> {
        this.addParameter(name, value);
        return this;
    }
}
