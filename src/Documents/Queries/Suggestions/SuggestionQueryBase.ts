import { Stopwatch } from "../../../Utility/Stopwatch";
import { QueryResult } from "../QueryResult";
import { QueryCommand } from "../../Commands/QueryCommand";
import { Lazy } from "../../Lazy";
import { LazySuggestionQueryOperation } from "../../Session/Operations/Lazy/LazySuggestionQueryOperation";
import { QueryOperation } from "../../Session/Operations/QueryOperation";
import { ObjectUtil } from "../../../Utility/ObjectUtil";
import { SuggestionResult } from "./SuggestionResult";
import { InMemoryDocumentSessionOperations } from "../../Session/InMemoryDocumentSessionOperations";
import { IndexQuery } from "../IndexQuery";
import { SuggestionsResponseObject } from "../../../Types";
import { DocumentSession } from "../../Session/DocumentSession";

export abstract class SuggestionQueryBase {

    private readonly _session: InMemoryDocumentSessionOperations;
    private _query: IndexQuery;
    private _duration: Stopwatch;

    protected constructor(session: InMemoryDocumentSessionOperations) {
        this._session = session;
    }

    public async execute(): Promise<SuggestionsResponseObject> {
        const command = this._getCommand();

        this._duration = Stopwatch.createStarted();
        this._session.incrementRequestCount();
        await this._session.requestExecutor.execute(command);

        return this._processResults(command.result);
    }

    private _processResults(queryResult: QueryResult) {
        this._invokeAfterQueryExecuted(queryResult);

        const results = {} as SuggestionsResponseObject;
        for (const result of queryResult.results) {

            const transformedResult = ObjectUtil.transformObjectKeys(result, {
                defaultTransform: "camel"
            }) as SuggestionResult;

            results[transformedResult.name] = transformedResult;
        }

        QueryOperation.ensureIsAcceptable(queryResult,
            this._query.waitForNonStaleResults, this._duration, this._session);
        return results;
    }

    public executeLazy(): Lazy<SuggestionsResponseObject> {
        this._query = this._getIndexQuery();

        return (this._session as DocumentSession).addLazyOperation(
            new LazySuggestionQueryOperation(
                this._session.conventions,
                this._query,
                result => this._invokeAfterQueryExecuted(result),
                (result, conventions) => this._processResults(result)
            ));
    }

    protected abstract _getIndexQuery(updateAfterQueryExecuted?: boolean): IndexQuery;

    protected abstract _invokeAfterQueryExecuted(result: QueryResult): void;

    private _getCommand(): QueryCommand {
        this._query = this._getIndexQuery();

        return new QueryCommand(this._session.conventions, this._query, {
            indexEntriesOnly: false,
            metadataOnly: false
        });
    }

    public toString(): string {
        return this._getIndexQuery(false).toString();
    }

}
