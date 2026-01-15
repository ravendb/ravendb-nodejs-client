import assert from "node:assert";
import {
    EmbeddingsGenerationConfiguration,
    ChunkingOptions,
    validateChunkingOptions,
    areChunkingOptionsEqual,
    DocumentConventions
} from "../../../../src/index.js";

describe("EmbeddingsGenerationConfiguration", () => {
    let conventions: DocumentConventions;

    beforeEach(() => {
        conventions = new DocumentConventions();
    });

    describe("ChunkingOptions validation", () => {
        it("should validate valid chunking options", () => {
            const options: ChunkingOptions = {
                chunkingMethod: "PlainTextSplitParagraphs",
                maxTokensPerChunk: 256,
                overlapTokens: 32
            };

            const errors = validateChunkingOptions("Description", options);
            assert.strictEqual(errors.length, 0, `Expected no errors, but got: ${errors.join(", ")}`);
        });

        it("should reject negative maxTokensPerChunk", () => {
            const options: ChunkingOptions = {
                chunkingMethod: "PlainTextSplit",
                maxTokensPerChunk: -1,
                overlapTokens: 0
            };

            const errors = validateChunkingOptions("Description", options);
            assert.ok(errors.length > 0, "Expected validation errors");
            assert.ok(errors[0].includes("maxTokensPerChunk"), "Should mention maxTokensPerChunk");
        });

        it("should reject overlapTokens with unsupported method", () => {
            const options: ChunkingOptions = {
                chunkingMethod: "PlainTextSplit",
                maxTokensPerChunk: 256,
                overlapTokens: 32
            };

            const errors = validateChunkingOptions("Description", options);
            assert.ok(errors.length > 0, "Expected validation errors");
            assert.ok(errors[0].includes("overlapTokens"), "Should mention overlapTokens");
        });

        it("should compare chunking options for equality", () => {
            const options1: ChunkingOptions = {
                chunkingMethod: "PlainTextSplitParagraphs",
                maxTokensPerChunk: 256,
                overlapTokens: 32
            };

            const options2: ChunkingOptions = {
                chunkingMethod: "PlainTextSplitParagraphs",
                maxTokensPerChunk: 256,
                overlapTokens: 32
            };

            assert.strictEqual(areChunkingOptionsEqual(options1, options2), true);
        });
    });

    describe("Path-based configuration", () => {
        it("should create valid path-based configuration", () => {
            const config = new EmbeddingsGenerationConfiguration();
            config.name = "Products Embeddings";
            config.collection = "Products";
            config.testMode = true;
            config.identifier = "products-embeddings";

            config.embeddingsPathConfigurations = [
                {
                    path: "Description",
                    chunkingOptions: {
                        chunkingMethod: "PlainTextSplitParagraphs",
                        maxTokensPerChunk: 256,
                        overlapTokens: 32
                    }
                }
            ];

            config.chunkingOptionsForQuerying = {
                chunkingMethod: "PlainTextSplit",
                maxTokensPerChunk: 256,
                overlapTokens: 0
            };

            config.quantization = "Int8";

            const errors = config.validate();
            assert.strictEqual(errors.length, 0, `Expected no errors, but got: ${errors.join(", ")}`);
        });

        it("should reject configuration without collection", () => {
            const config = new EmbeddingsGenerationConfiguration();
            config.name = "Test";
            config.testMode = true;
            config.identifier = "test";

            config.embeddingsPathConfigurations = [
                {
                    path: "Description",
                    chunkingOptions: {
                        chunkingMethod: "PlainTextSplit",
                        maxTokensPerChunk: 256,
                        overlapTokens: 0
                    }
                }
            ];

            config.chunkingOptionsForQuerying = {
                chunkingMethod: "PlainTextSplit",
                maxTokensPerChunk: 256,
                overlapTokens: 0
            };

            const errors = config.validate();
            assert.ok(errors.length > 0, "Expected validation errors");
            assert.ok(errors.some(e => e.includes("Collection")), "Should require collection");
        });
    });

    describe("Script-based configuration", () => {
        it("should create valid script-based configuration", () => {
            const config = new EmbeddingsGenerationConfiguration();
            config.name = "Articles Embeddings";
            config.collection = "Articles";
            config.testMode = true;
            config.identifier = "articles-embeddings";

            config.embeddingsTransformation = {
                script: `
                    var combined = this.Title + "\\n\\n" + this.Body;
                    embeddings.generate({ text: combined });
                `,
                chunkingOptions: {
                    chunkingMethod: "MarkDownSplitParagraphs",
                    maxTokensPerChunk: 512,
                    overlapTokens: 64
                }
            };

            config.chunkingOptionsForQuerying = {
                chunkingMethod: "PlainTextSplit",
                maxTokensPerChunk: 256,
                overlapTokens: 0
            };

            config.quantization = "Single";

            const errors = config.validate();
            assert.strictEqual(errors.length, 0, `Expected no errors, but got: ${errors.join(", ")}`);
        });

        it("should reject script without embeddings.generate", () => {
            const config = new EmbeddingsGenerationConfiguration();
            config.name = "Test";
            config.collection = "Articles";
            config.testMode = true;
            config.identifier = "test";

            config.embeddingsTransformation = {
                script: `var combined = this.Title + "\\n\\n" + this.Body;`,
                chunkingOptions: {
                    chunkingMethod: "PlainTextSplit",
                    maxTokensPerChunk: 256,
                    overlapTokens: 0
                }
            };

            config.chunkingOptionsForQuerying = {
                chunkingMethod: "PlainTextSplit",
                maxTokensPerChunk: 256,
                overlapTokens: 0
            };

            const errors = config.validate();
            assert.ok(errors.length > 0, "Expected validation errors");
            assert.ok(errors.some(e => e.includes("embeddings.generate")), "Should require embeddings.generate");
        });
    });

    describe("Validation rules", () => {
        it("should reject configuration with neither paths nor transformation", () => {
            const config = new EmbeddingsGenerationConfiguration();
            config.name = "Test";
            config.collection = "Products";
            config.testMode = true;
            config.identifier = "test";

            config.chunkingOptionsForQuerying = {
                chunkingMethod: "PlainTextSplit",
                maxTokensPerChunk: 256,
                overlapTokens: 0
            };

            const errors = config.validate();
            assert.ok(errors.length > 0, "Expected validation errors");
            assert.ok(
                errors.some(e => e.includes("EmbeddingsPathConfigurations") || e.includes("EmbeddingsTransformation")),
                "Should require either paths or transformation"
            );
        });

        it("should reject Text quantization", () => {
            const config = new EmbeddingsGenerationConfiguration();
            config.name = "Test";
            config.collection = "Products";
            config.testMode = true;
            config.identifier = "test";

            config.embeddingsPathConfigurations = [
                {
                    path: "Description",
                    chunkingOptions: {
                        chunkingMethod: "PlainTextSplit",
                        maxTokensPerChunk: 256,
                        overlapTokens: 0
                    }
                }
            ];

            config.chunkingOptionsForQuerying = {
                chunkingMethod: "PlainTextSplit",
                maxTokensPerChunk: 256,
                overlapTokens: 0
            };

            config.quantization = "Text";

            const errors = config.validate();
            assert.ok(errors.length > 0, "Expected validation errors");
            assert.ok(errors.some(e => e.includes("Quantization")), "Should reject Text quantization");
        });

        it("should generate identifier from name", () => {
            const config = new EmbeddingsGenerationConfiguration();
            config.name = "My Products Embeddings";

            const identifier = config.generateIdentifier();
            assert.strictEqual(typeof identifier, "string");
            assert.ok(/^[a-z0-9-]+$/.test(identifier), "Identifier should be lowercase alphanumeric with hyphens");
        });
    });

    describe("Serialization", () => {
        it("should serialize path-based configuration", () => {
            const config = new EmbeddingsGenerationConfiguration();
            config.name = "Products Embeddings";
            config.collection = "Products";
            config.testMode = true;
            config.identifier = "products-embeddings";

            config.embeddingsPathConfigurations = [
                {
                    path: "Description",
                    chunkingOptions: {
                        chunkingMethod: "PlainTextSplitParagraphs",
                        maxTokensPerChunk: 256,
                        overlapTokens: 32
                    }
                }
            ];

            config.chunkingOptionsForQuerying = {
                chunkingMethod: "PlainTextSplit",
                maxTokensPerChunk: 256,
                overlapTokens: 0
            };

            config.quantization = "Int8";

            const serialized = config.serialize(conventions) as any;

            assert.strictEqual(serialized.Identifier, "products-embeddings");
            assert.strictEqual(serialized.Collection, "Products");
            assert.strictEqual(serialized.Quantization, "Int8");
            assert.ok(Array.isArray(serialized.EmbeddingsPathConfigurations));
            assert.strictEqual(serialized.EmbeddingsPathConfigurations[0].Path, "Description");
        });

        it("should serialize script-based configuration", () => {
            const config = new EmbeddingsGenerationConfiguration();
            config.name = "Articles Embeddings";
            config.collection = "Articles";
            config.testMode = true;
            config.identifier = "articles-embeddings";

            config.embeddingsTransformation = {
                script: "embeddings.generate({ text: this.Title });",
                chunkingOptions: {
                    chunkingMethod: "PlainTextSplit",
                    maxTokensPerChunk: 256,
                    overlapTokens: 0
                }
            };

            config.chunkingOptionsForQuerying = {
                chunkingMethod: "PlainTextSplit",
                maxTokensPerChunk: 256,
                overlapTokens: 0
            };

            config.quantization = "Single";

            const serialized = config.serialize(conventions) as any;

            assert.ok(serialized.EmbeddingsTransformation);
            assert.ok(serialized.EmbeddingsTransformation.Script.includes("embeddings.generate"));
            assert.strictEqual(serialized.EmbeddingsPathConfigurations, null);
        });
    });

    describe("Comparison", () => {
        it("should detect equal configurations", () => {
            const config1 = new EmbeddingsGenerationConfiguration();
            config1.collection = "Products";
            config1.quantization = "Int8";
            config1.embeddingsPathConfigurations = [
                {
                    path: "Description",
                    chunkingOptions: {
                        chunkingMethod: "PlainTextSplit",
                        maxTokensPerChunk: 256,
                        overlapTokens: 0
                    }
                }
            ];
            config1.chunkingOptionsForQuerying = {
                chunkingMethod: "PlainTextSplit",
                maxTokensPerChunk: 256,
                overlapTokens: 0
            };

            const config2 = new EmbeddingsGenerationConfiguration();
            config2.collection = "Products";
            config2.quantization = "Int8";
            config2.embeddingsPathConfigurations = [
                {
                    path: "Description",
                    chunkingOptions: {
                        chunkingMethod: "PlainTextSplit",
                        maxTokensPerChunk: 256,
                        overlapTokens: 0
                    }
                }
            ];
            config2.chunkingOptionsForQuerying = {
                chunkingMethod: "PlainTextSplit",
                maxTokensPerChunk: 256,
                overlapTokens: 0
            };

            assert.strictEqual(config1.isEqual(config2), true);
        });

        it("should detect different collections", () => {
            const config1 = new EmbeddingsGenerationConfiguration();
            config1.collection = "Products";
            config1.chunkingOptionsForQuerying = {
                chunkingMethod: "PlainTextSplit",
                maxTokensPerChunk: 256,
                overlapTokens: 0
            };

            const config2 = new EmbeddingsGenerationConfiguration();
            config2.collection = "Articles";
            config2.chunkingOptionsForQuerying = {
                chunkingMethod: "PlainTextSplit",
                maxTokensPerChunk: 256,
                overlapTokens: 0
            };

            assert.strictEqual(config1.isEqual(config2), false);
        });
    });

    describe("Transformation name", () => {
        it("should return path-based transformation name", () => {
            const config = new EmbeddingsGenerationConfiguration();
            config.embeddingsPathConfigurations = [
                {
                    path: "Description",
                    chunkingOptions: {
                        chunkingMethod: "PlainTextSplit",
                        maxTokensPerChunk: 256,
                        overlapTokens: 0
                    }
                }
            ];

            assert.strictEqual(config.transformationName, "embeddings-from-paths");
        });

        it("should return script-based transformation name", () => {
            const config = new EmbeddingsGenerationConfiguration();
            config.embeddingsTransformation = {
                script: "embeddings.generate({ text: this.Title });",
                chunkingOptions: {
                    chunkingMethod: "PlainTextSplit",
                    maxTokensPerChunk: 256,
                    overlapTokens: 0
                }
            };

            assert.strictEqual(config.transformationName, "embeddings-transform-script");
        });
    });
});

