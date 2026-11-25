import { SuggestionsResponseObject } from "../../../Types/index.js";
import { Lazy } from "../../Lazy.js";
import { SuggestionBase } from "./SuggestionBase.js";
import { ISuggestionBuilder } from "./ISuggestionBuilder.js";

export interface ISuggestionDocumentQuery<T> {
    execute(): Promise<SuggestionsResponseObject>;

    executeLazy(onEval?: (result: SuggestionsResponseObject) => void): Lazy<SuggestionsResponseObject>;

    andSuggestUsing(suggestion: SuggestionBase): ISuggestionDocumentQuery<T>;

    andSuggestUsing(builder: (b: ISuggestionBuilder<T>) => void): ISuggestionDocumentQuery<T>;
}
