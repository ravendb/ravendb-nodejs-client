export interface SchemaValidationCollectionConfiguration {
    disabled?: boolean;
    schema: string; // JSON Schema as string
    /** Set by the server when the configuration is read, ignored when configuring. */
    lastModifiedTime?: Date;
}

export type SchemaDefinition = SchemaValidationCollectionConfiguration;
