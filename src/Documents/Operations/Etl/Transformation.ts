
export interface Transformation {
    name: string;
    disabled: boolean;
    collections: string[];
    applyToAllDocuments: boolean;
    script: string;
}