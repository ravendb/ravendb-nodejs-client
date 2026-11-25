import { SchemaValidationCollectionConfiguration } from "./SchemaValidationCollectionConfiguration.js";

export interface SchemaValidationConfiguration {
    disabled?: boolean;
    validatorsPerCollection: { [key: string]: SchemaValidationCollectionConfiguration };
}
