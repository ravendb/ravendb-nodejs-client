import { SuggestionsResponseObject } from "../../../Types";
import { Lazy } from "../../Lazy";

export interface ISuggestionDocumentQuery<T> {
    execute(): Promise<SuggestionsResponseObject>;

    executeLazy(): Lazy<SuggestionsResponseObject>;
}
