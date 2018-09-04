import { IIndexQuery } from "./IIndexQuery";
import { TypeUtil } from "../../Utility/TypeUtil";

export class IndexQueryBase<T> implements IIndexQuery {

    public pageSize: number = TypeUtil.MAX_INT32;
    public query: string;
    public queryParameters: T;
    public start: number;
    public waitForNonStaleResults: boolean;
    public waitForNonStaleResultsTimeout: number;

    public get pageSizeSet(): boolean {
        return !TypeUtil.isNullOrUndefined(this.pageSize);
    }
}
