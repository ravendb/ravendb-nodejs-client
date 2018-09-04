import { InMemoryDocumentSessionOperations } from "../../Session/InMemoryDocumentSessionOperations";
import { IndexQuery } from "../IndexQuery";
import { Stopwatch } from "../../../Utility/Stopwatch";
import { FacetResult } from ".";
import { QueryCommand, FacetQueryCommand } from "../../Commands/QueryCommand";
import { QueryResult } from "../QueryResult";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { TypesAwareObjectMapper } from "../../../Mapping/ObjectMapper";
import { QueryOperation } from "../../Session/Operations/QueryOperation";

export interface FacetResultObject { 
    [key: string]: FacetResult;
}

const FACET_RESULT_TYPE_INFO = { typeName: FacetResult.name };
const FACET_RESULT_TYPES_MAP = new Map([[FacetResult.name, FacetResult]]);

export abstract class AggregationQueryBase {

    private _session: InMemoryDocumentSessionOperations;
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

        return this._processResults(command.result, this._session.conventions);
    }
    
    // TBD public Lazy<Dictionary<string, FacetResult>> 
    //      ExecuteLazy(Action<Dictionary<string, FacetResult>> onEval = null)

    protected abstract _getIndexQuery(): IndexQuery;

    // tslint:disable-next-line:function-name
    protected abstract emit(evtName: "afterQueryExecuted", queryResult: QueryResult);
    
    private _processResults(queryResult: QueryResult, conventions: DocumentConventions): FacetResultObject {
        this.emit("afterQueryExecuted", queryResult);
        const results: FacetResultObject = {};
        const mapper = new TypesAwareObjectMapper();
        for (const result of queryResult.results) {
            const facetResult = mapper.fromObjectLiteral<FacetResult>(
                result, FACET_RESULT_TYPE_INFO, FACET_RESULT_TYPES_MAP);
            results[facetResult.name] = facetResult;
        }
        
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

    public toString(): String {
        return this._getIndexQuery().toString();
    }
}
