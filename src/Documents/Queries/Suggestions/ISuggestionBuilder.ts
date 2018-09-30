import {ISuggestionOperations} from "./ISuggestionOperations";

export interface ISuggestionBuilder<T> {

    byField(fieldName: string, term: string): ISuggestionOperations<T>;

    byField(fieldName: string, terms: string[]): ISuggestionOperations<T>;

    //TBD expr ISuggestionOperations<T> ByField(Expression<Func<T, object>> path, string term);
    //TBD expr ISuggestionOperations<T> ByField(Expression<Func<T, object>> path, string[] terms);
}
