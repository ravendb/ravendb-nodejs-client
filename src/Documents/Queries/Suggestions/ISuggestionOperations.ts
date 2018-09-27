import {SuggestionOptions} from "./SuggestionOptions";

export interface ISuggestionOperations<T> {
    withOptions(options: SuggestionOptions): ISuggestionOperations<T>;
}
