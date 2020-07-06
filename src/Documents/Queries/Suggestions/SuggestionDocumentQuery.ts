import { ISuggestionDocumentQuery } from "./ISuggestionDocumentQuery";
import { SuggestionQueryBase } from "./SuggestionQueryBase";
import { QueryResult } from "../QueryResult";
import { DocumentQuery } from "../../Session/DocumentQuery";
import { InMemoryDocumentSessionOperations } from "../../Session/InMemoryDocumentSessionOperations";
import { IndexQuery } from "../IndexQuery";

export class SuggestionDocumentQuery<T extends object>
    extends SuggestionQueryBase implements ISuggestionDocumentQuery<T> {

    private readonly _source: DocumentQuery<T>;

    public constructor(source: DocumentQuery<T>) {
        super(source.session as any as InMemoryDocumentSessionOperations);

        this._source = source;
    }

    protected _getIndexQuery(): IndexQuery {
        return this._source.getIndexQuery();
    }

    protected _invokeAfterQueryExecuted(result: QueryResult) {
        this._source.emit("afterQueryExecuted", result);
    }
}
