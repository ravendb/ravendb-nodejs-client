import { SuggestionsResponseObject } from "../../../Types";
import { Lazy } from "../../Lazy";
import { SuggestionBase } from "./SuggestionBase";
import { ISuggestionBuilder } from "./ISuggestionBuilder";

export interface ISuggestionDocumentQuery<T> {
    execute(): Promise<SuggestionsResponseObject>;

    executeLazy(): Lazy<SuggestionsResponseObject>;

    andSuggestUsing(suggestion: SuggestionBase): ISuggestionDocumentQuery<T>;

    andSuggestUsing(builder: (b: ISuggestionBuilder<T>) => void): ISuggestionDocumentQuery<T>;
}
