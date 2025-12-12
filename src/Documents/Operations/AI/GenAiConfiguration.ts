import { AbstractAiIntegrationConfiguration } from "./AbstractAiIntegrationConfiguration.js";
import { GenAiTransformation } from "./GenAiTransformation.js";
import { AiAgentToolQuery } from "./Agents/AiAgentToolQuery.js";
import { AiTaskIdentifierHelper } from "./AiTaskIdentifierHelper.js";
import { DocumentConventions } from "../../Conventions/DocumentConventions.js";
import { EtlType } from "../Etl/ConnectionString.js";

const DEFAULT_MAX_CONCURRENCY = 4;
const TRANSFORMATION_NAME = "GenAi-transform-script";

/**
 * Configuration for a GenAI ETL task.
 * GenAI ETL monitors a collection, applies transformations, sends context to AI models,
 * and updates documents based on AI responses.
 */
export class GenAiConfiguration extends AbstractAiIntegrationConfiguration {
    /**
     * Unique normalized identifier for this GenAI task.
     * Must be lowercase, alphanumeric with hyphens only.
     */
    public identifier: string;

    /**
     * The collection to monitor for changes.
     */
    public collection: string;

    /**
     * The transformation script that extracts context from documents.
     */
    public genAiTransformation: GenAiTransformation;

    /**
     * The prompt template to send to the AI model.
     * Can include placeholders for context data.
     */
    public prompt: string;

    /**
     * JSON schema defining the expected structure of AI responses.
     * Either this or sampleObject must be provided.
     */
    public jsonSchema?: string;

    /**
     * Sample JSON object showing the expected structure of AI responses.
     * Either this or jsonSchema must be provided.
     */
    public sampleObject?: string;

    /**
     * JavaScript function to update documents based on AI responses.
     * Should have signature: function update(doc, result) { ... return doc; }
     */
    public updateScript: string;

    /**
     * Maximum number of documents to process concurrently.
     * @default 4
     */
    public maxConcurrency: number = DEFAULT_MAX_CONCURRENCY;

    /**
     * Array of tool queries that the AI agent can use to query the database.
     */
    public queries: AiAgentToolQuery[] = [];

    /**
     * Enable detailed tracing of AI interactions.
     */
    public enableTracing: boolean = false;

    /**
     * Time in seconds after which generated context expires.
     */
    public expirationInSec?: number;

    /**
     * Gets the ETL type for this configuration.
     */
    public get etlType(): EtlType {
        return "GenAi";
    }

    /**
     * Gets the destination identifier for this ETL task.
     */
    public getDestination(): string {
        return this.identifier;
    }

    /**
     * Gets the default task name (same as identifier).
     */
    public getDefaultTaskName(): string {
        return this.identifier;
    }

    /**
     * Generates a normalized identifier from the configuration name.
     * @returns A normalized identifier string
     */
    public generateIdentifier(): string {
        return AiTaskIdentifierHelper.generateIdentifier(this.name);
    }

    /**
     * Validates the GenAI configuration.
     * @param validateName Whether to validate the name field
     * @param validateConnection Whether to validate the connection string
     * @param validateIdentifier Whether to validate the identifier
     * @returns Array of validation error messages (empty if valid)
     */
    public validate(
        validateName: boolean = true,
        validateConnection: boolean = true,
        validateIdentifier: boolean = true
    ): string[] {
        const errors: string[] = [];

        // Validate identifier
        if (validateIdentifier) {
            const idErrors = AiTaskIdentifierHelper.validateIdentifier(this.identifier);
            errors.push(...idErrors);
        }

        // Validate name
        if (validateName && (!this.name || this.name.trim().length === 0)) {
            errors.push("Name of GenAI configuration cannot be empty");
        }

        // Validate connection string name (non-test mode)
        if (!this.testMode && (!this.connectionStringName || this.connectionStringName.trim().length === 0)) {
            errors.push("ConnectionStringName cannot be empty");
        }

        // Validate connection
        if (validateConnection && !this.testMode) {
            const connectionErrors = this.connection?.validate() ?? [];
            errors.push(...connectionErrors);
        }

        // Validate model type
        if (validateConnection && this.connection) {
            if (this.connection.modelType !== "Chat") {
                errors.push("ModelType of GenAI configuration must be Chat");
            }
        }

        // Validate collection
        if (!this.collection || this.collection.trim().length === 0) {
            errors.push("Collection must be provided");
        }

        // Validate transformation
        if (!this.genAiTransformation) {
            errors.push("GenAiTransformation must be specified");
        } else {
            const scriptError = this.genAiTransformation.validateScript();
            if (scriptError) {
                errors.push(scriptError);
            }
        }

        // Validate prompt, schema/sample, and update script (non-test mode)
        if (!this.testMode) {
            if (!this.prompt || this.prompt.trim().length === 0) {
                errors.push("Prompt must be provided");
            }

            if ((!this.jsonSchema || this.jsonSchema.trim().length === 0) &&
                (!this.sampleObject || this.sampleObject.trim().length === 0)) {
                errors.push("You must provide either a JSON schema or a sample object");
            }

            if (!this.updateScript || this.updateScript.trim().length === 0) {
                errors.push("You must provide an update function");
            }
        }

        return errors;
    }

    public serialize(conventions: DocumentConventions): object {
        // Populate transforms array for base class serialization
        // GenAI uses a single transformation derived from genAiTransformation
        this.transforms = [
            {
                name: TRANSFORMATION_NAME,
                collections: [this.collection],
                script: this.genAiTransformation?.script
            }
        ];

        const result = super.serialize(conventions) as any;

        result.EtlType = this.etlType;
        result.Identifier = this.identifier;
        result.AiConnectorType = this.aiConnectorType;
        result.Collection = this.collection;
        result.Prompt = this.prompt;
        result.SampleObject = this.sampleObject;
        result.JsonSchema = this.jsonSchema;
        result.UpdateScript = this.updateScript;
        result.GenAiTransformation = this._serializeGenAiTransformation(this.genAiTransformation);
        result.MaxConcurrency = this.maxConcurrency;
        result.Queries = this.queries ? this.queries.map(q => this._serializeQuery(q)) : null;
        result.EnableTracing = this.enableTracing;
        result.ExpirationInSec = this.expirationInSec;

        return result;
    }

    /**
     * Checks if this configuration uses encrypted communication.
     * @returns true if the connection uses encryption, false otherwise
     */
    public usingEncryptedCommunicationChannel(): boolean {
        return this.connection?.usingEncryptedCommunicationChannel() ?? false;
    }

    private _serializeQuery(query: AiAgentToolQuery) {
        return {
            Name: query.name,
            Description: query.description,
            Query: query.query,
            ParametersSampleObject: query.parametersSampleObject,
            ParametersSchema: query.parametersSchema,
            Options: query.options ? {
                AllowModelQueries: query.options.allowModelQueries,
                AddToInitialContext: query.options.addToInitialContext
            } : undefined
        };
    }

    private _serializeGenAiTransformation(transformation: GenAiTransformation) {
        return {
            Script: transformation.script
        };
    }
}

