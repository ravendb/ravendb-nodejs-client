import { SuggestionOptions } from "./SuggestionOptions";

export interface ISuggestionOperations<T> {
    withDisplayName(displayName: string): ISuggestionOperations<T>;
    withOptions(options: SuggestionOptions): ISuggestionOperations<T>;
}
