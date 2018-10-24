import { HighlightingOptions } from "./HighlightingOptions";

export interface HighlightingParameters extends HighlightingOptions {
    fieldName: string; 
    fragmentLength: number;
    fragmentCount: number;
}
