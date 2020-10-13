import { throwError } from "../../Exceptions";

export class BulkInsertConventions {
    private readonly _notFrozen: () => void;
    private _timeSeriesBatchSize: number;

    constructor(notFrozen: () => void) {
        this._timeSeriesBatchSize = 1024;
        this._notFrozen = notFrozen;
    }

    public get timeSeriesBatchSize() {
        return this._timeSeriesBatchSize;
    }

    public set timeSeriesBatchSize(batchSize: number) {
        this._notFrozen();

        if (batchSize <= 0) {
            throwError("InvalidArgumentException", "BatchSize must be positive");
        }

        this._timeSeriesBatchSize = batchSize;
    }
}