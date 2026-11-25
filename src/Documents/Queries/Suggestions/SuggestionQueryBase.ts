import { Stopwatch } from "../../../Utility/Stopwatch.js";
import { QueryResult } from "../QueryResult.js";
import { QueryCommand } from "../../Commands/QueryCommand.js";
import { Lazy } from "../../Lazy.js";
import { LazySuggestionQueryOperation } from "../../Session/Operations/Lazy/LazySuggestionQueryOperation.js";
import { QueryOperation } from "../../Session/Operations/QueryOperation.js";
import { ObjectUtil } from "../../../Utility/ObjectUtil.js";
import { SuggestionResult } from "./SuggestionResult.js";
import { InMemoryDocumentSessionOperations } from "../../Session/InMemoryDocumentSessionOperations.js";
import { IndexQuery } from "../IndexQuery.js";
import { SuggestionsResponseObject } from "../../../Types/index.js";
import { DocumentSession } from "../../Session/DocumentSession.js";

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
                defaultTransform: ObjectUtil.camel
            }) as SuggestionResult;

            results[transformedResult.name] = transformedResult;
        }

        QueryOperation.ensureIsAcceptable(queryResult,
            this._query.waitForNonStaleResults, this._duration, this._session);
        return results;
    }

    public executeLazy(onEval?: (result: SuggestionsResponseObject) => void): Lazy<SuggestionsResponseObject> {
        this._query = this._getIndexQuery();

        return (this._session as DocumentSession).addLazyOperation(
            new LazySuggestionQueryOperation(
                this._session,
                this._query,
                result => this._invokeAfterQueryExecuted(result),
                (result) => this._processResults(result)
            ), onEval);
    }

    protected abstract _getIndexQuery(updateAfterQueryExecuted?: boolean): IndexQuery;

    protected abstract _invokeAfterQueryExecuted(result: QueryResult): void;

    private _getCommand(): QueryCommand {
        this._query = this._getIndexQuery();

        return new QueryCommand(this._session, this._query, {
            indexEntriesOnly: false,
            metadataOnly: false
        });
    }

    public toString(): string {
        return this._getIndexQuery(false).toString();
    }

}
