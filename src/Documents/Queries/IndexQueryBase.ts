import { IIndexQuery } from "./IIndexQuery";
import { TypeUtil } from "../../Utility/TypeUtil";

export class IndexQueryBase<T> implements IIndexQuery {

    public pageSize: number = TypeUtil.MAX_INT32;
    public pageSizeSet: boolean;
    public query: String;
    public queryParameters: T;
    public start: number;
    public waitForNonStaleResults: boolean;
    public waitForNonStaleResultsTimeout: number;
}
