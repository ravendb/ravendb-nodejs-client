import { AbstractAiIntegrationConfiguration } from "./AbstractAiIntegrationConfiguration.js";
import { EmbeddingPathConfiguration, areEmbeddingPathConfigurationsEqual } from "./EmbeddingPathConfiguration.js";
import { EmbeddingsTransformation, validateEmbeddingsTransformation, areEmbeddingsTransformationsEqual } from "./EmbeddingsTransformation.js";
import { ChunkingOptions, validateChunkingOptions, areChunkingOptionsEqual } from "./ChunkingOptions.js";
import { VectorEmbeddingType } from "../../Queries/VectorSearch/VectorEmbeddingType.js";
import { AiTaskIdentifierHelper } from "./AiTaskIdentifierHelper.js";
import { EtlType } from "../Etl/ConnectionString.js";
import { DocumentConventions } from "../../Conventions/DocumentConventions.js";
import { TimeUtil } from "../../../Utility/TimeUtil.js";

const PATHS_TRANSFORMATION_NAME = "embeddings-from-paths";
const SCRIPT_TRANSFORMATION_NAME = "embeddings-transform-script";
const DEFAULT_EMBEDDINGS_CACHE_EXPIRATION_MS = 90 * 24 * 60 * 60 * 1000; // 90 days in milliseconds
const DEFAULT_QUERY_CACHE_EXPIRATION_MS = 14 * 24 * 60 * 60 * 1000; // 14 days in milliseconds

/**
 * Configuration for an Embeddings Generation ETL task.
 * Embeddings Generation ETL monitors a collection and automatically generates vector embeddings
 * for specified document fields, enabling semantic search capabilities.
 */
export class EmbeddingsGenerationConfiguration extends AbstractAiIntegrationConfiguration {
    /**
     * Unique normalized identifier for this embeddings generation task.
     * Must be lowercase, alphanumeric with hyphens only.
     */
    public identifier: string;

    /**
     * The collection to monitor for embedding generation.
     */
    public collection: string;

    /**
     * List of field paths to generate embeddings for (path-based approach).
     * Mutually exclusive with embeddingsTransformation.
     */
    public embeddingsPathConfigurations?: EmbeddingPathConfiguration[];

    /**
     * Transformation script for custom embedding generation (script-based approach).
     * Must use embeddings.generate() function.
     * Mutually exclusive with embeddingsPathConfigurations.
     */
    public embeddingsTransformation?: EmbeddingsTransformation;

    /**
     * Vector quantization type for storing embeddings.
     * Cannot be "Text" - must be "Single", "Int8", or "Binary".
     * @default "Single"
     */
    public quantization: VectorEmbeddingType = "Single";

    /**
     * Chunking options for query-time embedding generation.
     * Required for processing search queries.
     */
    public chunkingOptionsForQuerying: ChunkingOptions;

    /**
     * Cache expiration time for document embeddings in milliseconds.
     * @default 90 days (7776000000 ms)
     */
    public embeddingsCacheExpiration: number = DEFAULT_EMBEDDINGS_CACHE_EXPIRATION_MS;

    /**
     * Cache expiration time for query embeddings in milliseconds.
     * @default 14 days (1209600000 ms)
     */
    public embeddingsCacheForQueryingExpiration: number = DEFAULT_QUERY_CACHE_EXPIRATION_MS;

    /**
     * Gets the transformation name based on the configuration approach.
     * @internal
     */
    public get transformationName(): string {
        return this.embeddingsTransformation == null
            ? PATHS_TRANSFORMATION_NAME
            : SCRIPT_TRANSFORMATION_NAME;
    }

    /**
     * Gets the ETL type for this configuration.
     */
    public get etlType(): EtlType {
        return "EmbeddingsGeneration";
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
     * Validates the embeddings generation configuration.
     * @param options.validateName Whether to validate the name field (default: true)
     * @param options.validateConnection Whether to validate the connection string (default: true)
     * @param options.validateIdentifier Whether to validate the identifier (default: true)
     * @returns Array of validation error messages (empty if valid)
     */
    public validate(options?: {
        validateName?: boolean;
        validateConnection?: boolean;
        validateIdentifier?: boolean;
        existingConfiguration?: EmbeddingsGenerationConfiguration;
    }): string[] {
        const {
            validateName = true,
            validateConnection = true,
            validateIdentifier = true,
            existingConfiguration
        } = options ?? {};

        const errors: string[] = [];

        if (existingConfiguration?.name && existingConfiguration.name !== this.name) {
            errors.push("Changing Name of ETL is not supported.");
        }

        if (validateIdentifier) {
            const idErrors = AiTaskIdentifierHelper.validateIdentifier(this.identifier);
            errors.push(...idErrors);
        }

        if (validateName && (!this.name || this.name.trim().length === 0)) {
            errors.push("Name of Embeddings Generation configuration cannot be empty");
        }

        if (!this.testMode && (!this.connectionStringName || this.connectionStringName.trim().length === 0)) {
            errors.push("ConnectionStringName cannot be empty");
        }

        if (validateConnection && !this.testMode) {
            const connectionErrors = this.connection?.validate() ?? [];
            errors.push(...connectionErrors);
        }

        if (validateConnection && this.connection) {
            if (this.connection.modelType !== "TextEmbeddings") {
                errors.push("ModelType of Embeddings Generation configuration must be TextEmbeddings");
            }
        }

        if (!this.collection || this.collection.trim().length === 0) {
            errors.push("Collection must be provided");
        }

        const hasPaths = this.embeddingsPathConfigurations && this.embeddingsPathConfigurations.length > 0;
        const hasTransformation = this.embeddingsTransformation && this.embeddingsTransformation.script;

        if (!hasPaths && !hasTransformation) {
            errors.push(
                "Configuration must have either EmbeddingsPathConfigurations or EmbeddingsTransformation script specified"
            );
        }

        // Validate path configurations
        if (this.embeddingsPathConfigurations) {
            for (const pathConfig of this.embeddingsPathConfigurations) {
                if (!pathConfig.path || pathConfig.path.trim().length === 0) {
                    errors.push("Path configuration: Path cannot be empty");
                }

                if (pathConfig.chunkingOptions) {
                    const chunkingErrors = validateChunkingOptions(
                        pathConfig.path || "Path configuration",
                        pathConfig.chunkingOptions
                    );
                    errors.push(...chunkingErrors);
                } else {
                    errors.push(`Path '${pathConfig.path}': ChunkingOptions must be provided.`);
                }
            }
        }

        if (this.embeddingsTransformation) {
            const transformationErrors = validateEmbeddingsTransformation(this.embeddingsTransformation);
            errors.push(...transformationErrors);
        }

        if (this.quantization === "Text") {
            errors.push("Quantization cannot be Text");
        }

        if (!this.chunkingOptionsForQuerying) {
            errors.push("ChunkingOptionsForQuerying must be provided.");
        } else {
            if (this.chunkingOptionsForQuerying.maxTokensPerChunk <= 0) {
                errors.push(
                    "ChunkingOptionsForQuerying must be specified with maxTokensPerChunk greater than 0."
                );
            }

            if (this.chunkingOptionsForQuerying.overlapTokens < 0) {
                errors.push(
                    "ChunkingOptionsForQuerying must be specified with overlapTokens greater than, or equal to 0."
                );
            }
        }

        return errors;
    }

    /**
     * Serializes the configuration to JSON format for server communication.
     * @param conventions Document conventions for serialization
     * @returns Serialized configuration object
     */
    public serialize(conventions: DocumentConventions): object {
        if (this.embeddingsTransformation) {
            this.transforms = [
                {
                    name: SCRIPT_TRANSFORMATION_NAME,
                    collections: [this.collection],
                    script: this.embeddingsTransformation.script
                }
            ];
        } else {
            this.transforms = [
                {
                    name: PATHS_TRANSFORMATION_NAME,
                    collections: [this.collection]
                }
            ];
        }

        const result = super.serialize(conventions) as any;

        result.EtlType = this.etlType;
        result.Identifier = this.identifier;
        result.AiConnectorType = this.aiConnectorType;
        result.Collection = this.collection;
        result.EmbeddingsPathConfigurations = this.embeddingsPathConfigurations
            ? this.embeddingsPathConfigurations.map(p => this._serializePathConfiguration(p))
            : null;
        result.EmbeddingsTransformation = this.embeddingsTransformation
            ? this._serializeTransformation(this.embeddingsTransformation)
            : null;
        result.Quantization = this.quantization;
        result.ChunkingOptionsForQuerying = this._serializeChunkingOptions(this.chunkingOptionsForQuerying);
        result.EmbeddingsCacheExpiration = TimeUtil.millisToTimeSpan(this.embeddingsCacheExpiration);
        result.EmbeddingsCacheForQueryingExpiration = TimeUtil.millisToTimeSpan(
            this.embeddingsCacheForQueryingExpiration
        );

        return result;
    }

    /**
     * Checks if this configuration uses encrypted communication.
     * @returns true if the connection uses encryption, false otherwise
     */
    public usingEncryptedCommunicationChannel(): boolean {
        return this.connection?.usingEncryptedCommunicationChannel() ?? false;
    }

    /**
     * Compares this configuration with another to detect differences.
     * @param other The other configuration to compare with
     * @returns true if configurations are equivalent, false otherwise
     */
    public isEqual(other: EmbeddingsGenerationConfiguration): boolean {
        if (!other) {
            return false;
        }

        if (this.collection !== other.collection ||
            this.quantization !== other.quantization ||
            this.embeddingsCacheExpiration !== other.embeddingsCacheExpiration ||
            this.embeddingsCacheForQueryingExpiration !== other.embeddingsCacheForQueryingExpiration) {
            return false;
        }

        if (!areEmbeddingsTransformationsEqual(this.embeddingsTransformation, other.embeddingsTransformation)) {
            return false;
        }

        if (!areChunkingOptionsEqual(this.chunkingOptionsForQuerying, other.chunkingOptionsForQuerying)) {
            return false;
        }

        return this._arePathConfigurationsEqual(
            this.embeddingsPathConfigurations,
            other.embeddingsPathConfigurations
        );
    }

    private _arePathConfigurationsEqual(
        left: EmbeddingPathConfiguration[] | undefined,
        right: EmbeddingPathConfiguration[] | undefined
    ): boolean {
        if (left == null && right == null) {
            return true;
        }

        if (left == null || right == null) {
            return false;
        }

        if (left.length !== right.length) {
            return false;
        }

        for (const leftConfig of left) {
            const rightConfig = right.find(r => r.path === leftConfig.path);
            if (!rightConfig || !areEmbeddingPathConfigurationsEqual(leftConfig, rightConfig)) {
                return false;
            }
        }

        return true;
    }

    private _serializePathConfiguration(config: EmbeddingPathConfiguration) {
        return {
            Path: config.path,
            ChunkingOptions: this._serializeChunkingOptions(config.chunkingOptions)
        };
    }

    private _serializeTransformation(transformation: EmbeddingsTransformation) {
        return {
            Script: transformation.script,
            ChunkingOptions: this._serializeChunkingOptions(transformation.chunkingOptions)
        };
    }

    private _serializeChunkingOptions(options: ChunkingOptions) {
        if (!options) {
            return null;
        }

        return {
            ChunkingMethod: options.chunkingMethod,
            MaxTokensPerChunk: options.maxTokensPerChunk,
            OverlapTokens: options.overlapTokens,
            ContextPrefix: options?.contextPrefix
        };
    }
}

