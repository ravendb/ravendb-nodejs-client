import { InMemoryDocumentSessionOperations } from "../../Session/InMemoryDocumentSessionOperations";
import { IndexQuery } from "../IndexQuery";
import { Stopwatch } from "../../../Utility/Stopwatch";
import { FacetResult } from ".";
import { QueryCommand } from "../../Commands/QueryCommand";
import { FacetQueryCommand } from "../../Commands/FacetQueryCommand";
import { QueryResult } from "../QueryResult";
import { TypesAwareObjectMapper } from "../../../Mapping/ObjectMapper";
import { QueryOperation } from "../../Session/Operations/QueryOperation";
import { Lazy } from "../../Lazy";
import { DocumentSession } from "../../Session/DocumentSession";
import { LazyAggregationQueryOperation } from "../../Session/Operations/Lazy/LazyAggregationQueryOperation";

export interface FacetResultObject {
    [key: string]: FacetResult;
}

export abstract class AggregationQueryBase {

    private readonly _session: InMemoryDocumentSessionOperations;
    private _query: IndexQuery;
    private _duration: Stopwatch;

    protected constructor(session: InMemoryDocumentSessionOperations) {
        this._session = session;
    }

    public async execute(): Promise<FacetResultObject> {
        const command: QueryCommand = this._getCommand();

        this._duration = Stopwatch.createStarted();
        this._session.incrementRequestCount();
        await this._session.requestExecutor.execute(command);

        return this._processResults(command.result);
    }

    public executeLazy(): Lazy<FacetResultObject> {
        this._query = this._getIndexQuery();
        return (this._session as DocumentSession)
            .addLazyOperation(
                new LazyAggregationQueryOperation(
                    this._session,
                    this._query,
                    this,
                    (queryResult: QueryResult) =>
                        this._processResults(queryResult)));
    }

    protected abstract _getIndexQuery(updateAfterQueryExecuted?: boolean): IndexQuery;

    // tslint:disable-next-line:function-name
    public abstract emit(evtName: "afterQueryExecuted", queryResult: QueryResult);

    private _processResults(queryResult: QueryResult): FacetResultObject {
        this.emit("afterQueryExecuted", queryResult);
        const results: FacetResultObject = {};
        const mapper = new TypesAwareObjectMapper();
        for (const result of queryResult.results) {
            const facetResult = Object.assign(new FacetResult(), result);
            results[facetResult.name] = facetResult;
        }

        this._session.registerIncludes(queryResult.includes);

        QueryOperation.ensureIsAcceptable(
            queryResult, this._query.waitForNonStaleResults, this._duration, this._session);

        return results;
    }

    private _getCommand(): QueryCommand {
        this._query = this._getIndexQuery();
        return new FacetQueryCommand(this._session.conventions, this._query, {
            metadataOnly: false,
            indexEntriesOnly: false
        });
    }

    public toString(): string {
        return this._getIndexQuery(false).toString();
    }
}
