import { GetRequest } from "../../../Commands/MultiGet/GetRequest";
import { GetResponse } from "../../../Commands/MultiGet/GetResponse";
import { QueryResult } from "../../../Queries/QueryResult";

export interface ILazyOperation {
    result: any;
    queryResult: QueryResult;
    requiresRetry: boolean;

    createRequest(): GetRequest;

    handleResponseAsync(response: GetResponse): Promise<void>;
}
