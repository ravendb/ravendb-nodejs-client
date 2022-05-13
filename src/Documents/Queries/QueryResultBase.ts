import { QueryTimings } from "../Queries/Timings/QueryTimings";

export abstract class QueryResultBase<TResult, TInclude> {

    public results: TResult;

    public includes: TInclude;

    public includedPaths: string[];

    public isStale: boolean;

    public indexTimestamp: Date;

    public indexName: string;

    public resultEtag: number;

    public lastQueryTime: Date;

    public counterIncludes: object;

    public revisionIncludes: any[];

    public includedCounterNames: { [key: string]: string[] };

    public timeSeriesIncludes: any;

    public compareExchangeValueIncludes: any;

    public nodeTag: string;

    public timings: QueryTimings;
}
