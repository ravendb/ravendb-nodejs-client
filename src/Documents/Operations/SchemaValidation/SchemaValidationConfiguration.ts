import { SchemaValidationCollectionConfiguration } from "./SchemaValidationCollectionConfiguration.js";

export interface SchemaValidationConfiguration {
    validatorsPerCollection: { [key: string]: SchemaValidationCollectionConfiguration };
}
