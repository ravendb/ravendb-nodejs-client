import { ISuggestionDocumentQuery } from "./ISuggestionDocumentQuery";
import { SuggestionQueryBase } from "./SuggestionQueryBase";
import { QueryResult } from "../QueryResult";
import { DocumentQuery } from "../../Session/DocumentQuery";
import { InMemoryDocumentSessionOperations } from "../../Session/InMemoryDocumentSessionOperations";
import { IndexQuery } from "../IndexQuery";
import { SuggestionBase } from "./SuggestionBase";
import { ISuggestionBuilder } from "./ISuggestionBuilder";
import { SuggestionBuilder } from "./SuggestionBuilder";

export class SuggestionDocumentQuery<T extends object>
    extends SuggestionQueryBase implements ISuggestionDocumentQuery<T> {

    private readonly _source: DocumentQuery<T>;

    public constructor(source: DocumentQuery<T>) {
        super(source.session as any as InMemoryDocumentSessionOperations);

        this._source = source;
    }

    protected _getIndexQuery(updateAfterQueryExecuted: boolean = true): IndexQuery {
        return this._source.getIndexQuery();
    }

    protected _invokeAfterQueryExecuted(result: QueryResult) {
        this._source.emit("afterQueryExecuted", result);
    }

    andSuggestUsing(suggestion: SuggestionBase): ISuggestionDocumentQuery<T>;
    andSuggestUsing(builder: (b: ISuggestionBuilder<T>) => void): ISuggestionDocumentQuery<T>;
    andSuggestUsing(suggestionOrBuilder: SuggestionBase | ((b: ISuggestionBuilder<T>) => void)): ISuggestionDocumentQuery<T> {
        if (suggestionOrBuilder instanceof SuggestionBase) {
            this._source._suggestUsing(suggestionOrBuilder);
        } else {
            const f = new SuggestionBuilder();
            suggestionOrBuilder(f);
            this._source.suggestUsing(f.suggestion);
        }

        return this;
    }


}
