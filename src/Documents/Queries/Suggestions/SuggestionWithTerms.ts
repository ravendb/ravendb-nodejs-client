import {SuggestionBase} from "./SuggestionBase";

export class SuggestionWithTerms extends SuggestionBase {
    public terms: string[];

    public constructor(field: string) {
        super(field);
    }
}
