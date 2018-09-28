import {StringDistanceTypes} from "./StringDistanceTypes";
import {SuggestionSortMode} from "./SuggestionSortMode";

export interface SuggestionOptions {
    pageSize: number;
    distance: StringDistanceTypes;
    accuracy: number;
    sortMode: SuggestionSortMode;
}
