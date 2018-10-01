export abstract class QueryResultBase<TResult, TInclude> {

    public results: TResult;

    public includes: TInclude;

    public includedPaths: string[];

    public isStale: boolean;

    public indexTimestamp: Date;

    public indexName: string;

    public resultEtag: number;

    public lastQueryTime: Date;
}
