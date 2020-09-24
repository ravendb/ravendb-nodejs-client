import { SuggestionOptions } from "./SuggestionOptions";

export abstract class SuggestionBase {
    public field: string;
    public displayField: string;
    public options: SuggestionOptions;

    protected constructor(field: string) {
        this.field = field;
    }
}
