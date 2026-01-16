import {disposeTestDocumentStore, RavenTestContext, testContext} from "../../../Utils/TestUtil.js";
import {
    AddEmbeddingsGenerationOperation,
    AiConnectionString,
    EmbeddedSettings,
    EmbeddingsGenerationConfiguration,
    GetOngoingTaskInfoOperation,
    IDocumentStore,
    PutConnectionStringOperation,
    UpdateEmbeddingsGenerationOperation
} from "../../../../src/index.js";
import {assertThat} from "../../../Utils/AssertExtensions.js";

((RavenTestContext.isRavenDbServerVersion("7.1") && !RavenTestContext.isPullRequest) ? describe : describe.skip)("EmbeddingsGenerationEtlTest", function () {
    let store: IDocumentStore;

    async function putEmbeddingsConnectionString(docStore: IDocumentStore) {
        const csName = `embeddings-${Date.now()}`;
        const aiConnectionString = new AiConnectionString();
        aiConnectionString.name = csName;
        aiConnectionString.modelType = "TextEmbeddings";
        aiConnectionString.embeddedSettings = new EmbeddedSettings();

        await docStore.maintenance.send(new PutConnectionStringOperation(aiConnectionString));

        return csName;
    }

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () => {
        await disposeTestDocumentStore(store);
    });

    it("can add embeddings generation task with path-based configuration", async function () {
        // Define connection string
        const csName = await putEmbeddingsConnectionString(store);

        // Create embeddings generation configuration
        const config = new EmbeddingsGenerationConfiguration();
        config.name = "Products Embeddings Path-Based";
        config.collection = "Products";
        config.connectionStringName = csName;
        config.identifier = config.generateIdentifier();

        // Path-based approach
        config.embeddingsPathConfigurations = [
            {
                path: "Description",
                chunkingOptions: {
                    chunkingMethod: "PlainTextSplitParagraphs",
                    maxTokensPerChunk: 256,
                    overlapTokens: 32
                }
            },
            {
                path: "Details",
                chunkingOptions: {
                    chunkingMethod: "MarkDownSplitParagraphs",
                    maxTokensPerChunk: 512,
                    overlapTokens: 64
                }
            }
        ];

        config.chunkingOptionsForQuerying = {
            chunkingMethod: "PlainTextSplit",
            maxTokensPerChunk: 256,
            overlapTokens: 0
        };

        config.quantization = "Int8";

        // Validate
        const errors = config.validate();
        assertThat(errors.length).isEqualTo(0);

        // Add the task
        const operation = new AddEmbeddingsGenerationOperation(config);
        const result = await store.maintenance.send(operation);

        assertThat(result.taskId).isGreaterThan(0);
        assertThat(result.identifier).isNotNull();
        assertThat(result.identifier).isEqualTo(config.identifier);
    });

    it("can add embeddings generation task with script-based configuration", async function () {
        // Define connection string
        const csName = await putEmbeddingsConnectionString(store);

        // Create embeddings generation configuration
        const config = new EmbeddingsGenerationConfiguration();
        config.name = "Articles Embeddings Script-Based";
        config.collection = "Articles";
        config.connectionStringName = csName;
        config.identifier = config.generateIdentifier();

        // Script-based approach
        config.embeddingsTransformation = {
            script: `
                var title = this.Title || "";
                var body = this.Body || "";
                var combined = title + "\\n\\n" + body;
                
                embeddings.generate({
                    text: combined,
                    field: "ContentEmbedding"
                });
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

        // Validate
        const errors = config.validate();
        assertThat(errors.length).isEqualTo(0);

        // Add the task
        const operation = new AddEmbeddingsGenerationOperation(config);
        const result = await store.maintenance.send(operation);

        assertThat(result.taskId).isGreaterThan(0);
        assertThat(result.identifier).isNotNull();
        assertThat(result.identifier).isEqualTo(config.identifier);
    });

    it("can update embeddings generation task", async function () {
        // Define connection string
        const csName = await putEmbeddingsConnectionString(store);

        // Create initial configuration
        const config = new EmbeddingsGenerationConfiguration();
        config.name = "Products Embeddings Update Test";
        config.collection = "Products";
        config.connectionStringName = csName;
        config.identifier = config.generateIdentifier();

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

        config.quantization = "Int8";

        // Add the task
        const addResult = await store.maintenance.send(new AddEmbeddingsGenerationOperation(config));
        const taskId = addResult.taskId;

        // Update configuration
        config.quantization = "Single";
        config.embeddingsCacheExpiration = 30 * 24 * 60 * 60 * 1000; // 30 days

        // Update without reset
        const updateOperation = new UpdateEmbeddingsGenerationOperation(taskId, config);
        const updateResult = await store.maintenance.send(updateOperation);

        assertThat(updateResult.taskId).isEqualTo(taskId + 1);
        assertThat(updateResult.raftCommandIndex).isGreaterThan(0);
    });

    it("validates quantization types", async function () {
        const config = new EmbeddingsGenerationConfiguration();
        config.name = "Test Quantization";
        config.collection = "Products";
        config.testMode = true;
        config.identifier = "test-quantization";

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

        // Test valid quantization types
        config.quantization = "Int8";
        let errors = config.validate();
        assertThat(errors.length).isEqualTo(0);

        config.quantization = "Single";
        errors = config.validate();
        assertThat(errors.length).isEqualTo(0);

        config.quantization = "Binary";
        errors = config.validate();
        assertThat(errors.length).isEqualTo(0);

        // Test invalid quantization type
        config.quantization = "Text";
        errors = config.validate();
        assertThat(errors.length).isGreaterThan(0);
        assertThat(errors.some(e => e.includes("Quantization") && e.includes("Text"))).isTrue();
    });

    it("validates chunking methods with overlap tokens", async function () {
        const config = new EmbeddingsGenerationConfiguration();
        config.name = "Test Chunking Overlap";
        config.collection = "Products";
        config.testMode = true;
        config.identifier = "test-chunking";

        config.chunkingOptionsForQuerying = {
            chunkingMethod: "PlainTextSplit",
            maxTokensPerChunk: 256,
            overlapTokens: 0
        };

        // Overlap tokens with unsupported method should fail
        config.embeddingsPathConfigurations = [
            {
                path: "Description",
                chunkingOptions: {
                    chunkingMethod: "PlainTextSplit",
                    maxTokensPerChunk: 256,
                    overlapTokens: 32  // Not supported for PlainTextSplit
                }
            }
        ];

        let errors = config.validate();
        assertThat(errors.length).isGreaterThan(0);

        // Overlap tokens with supported method should pass
        config.embeddingsPathConfigurations = [
            {
                path: "Description",
                chunkingOptions: {
                    chunkingMethod: "PlainTextSplitParagraphs",
                    maxTokensPerChunk: 256,
                    overlapTokens: 32  // Supported for PlainTextSplitParagraphs
                }
            }
        ];

        errors = config.validate();
        assertThat(errors.length).isEqualTo(0);

        // Test MarkDownSplitParagraphs
        config.embeddingsPathConfigurations = [
            {
                path: "Description",
                chunkingOptions: {
                    chunkingMethod: "MarkDownSplitParagraphs",
                    maxTokensPerChunk: 512,
                    overlapTokens: 64  // Supported for MarkDownSplitParagraphs
                }
            }
        ];

        errors = config.validate();
        assertThat(errors.length).isEqualTo(0);
    });

    it("validates cache expiration settings", async function () {
        const config = new EmbeddingsGenerationConfiguration();
        config.name = "Test Cache Expiration";
        config.collection = "Products";
        config.testMode = true;
        config.identifier = "test-cache";

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

        // Test custom cache expiration
        config.embeddingsCacheExpiration = 60 * 24 * 60 * 60 * 1000; // 60 days
        config.embeddingsCacheForQueryingExpiration = 7 * 24 * 60 * 60 * 1000; // 7 days

        const errors = config.validate();
        assertThat(errors.length).isEqualTo(0);

        // Verify serialization includes cache settings
        const serialized = config.serialize(store.conventions) as any;
        assertThat(serialized.EmbeddingsCacheExpiration).isNotNull();
        assertThat(serialized.EmbeddingsCacheForQueryingExpiration).isNotNull();
    });

    it("validates transformation name mapping", async function () {
        const pathConfig = new EmbeddingsGenerationConfiguration();
        pathConfig.embeddingsPathConfigurations = [
            {
                path: "Description",
                chunkingOptions: {
                    chunkingMethod: "PlainTextSplit",
                    maxTokensPerChunk: 256,
                    overlapTokens: 0
                }
            }
        ];

        assertThat(pathConfig.transformationName).isEqualTo("embeddings-from-paths");

        const scriptConfig = new EmbeddingsGenerationConfiguration();
        scriptConfig.embeddingsTransformation = {
            script: "embeddings.generate({ text: this.Title });",
            chunkingOptions: {
                chunkingMethod: "PlainTextSplit",
                maxTokensPerChunk: 256,
                overlapTokens: 0
            }
        };

        assertThat(scriptConfig.transformationName).isEqualTo("embeddings-transform-script");
    });

    it("can get ongoing task info", async () => {
        const csName = await putEmbeddingsConnectionString(store);

        const config = new EmbeddingsGenerationConfiguration();
        config.name = "Products Embeddings Task Info Test";
        config.collection = "Products";
        config.connectionStringName = csName;
        config.identifier = config.generateIdentifier();

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

        config.quantization = "Int8";

        const addResult = await store.maintenance.send(new AddEmbeddingsGenerationOperation(config));
        const taskId = addResult.taskId;

        assertThat(addResult.taskId).isNotNull();
        assertThat(addResult.raftCommandIndex).isNotNull();

        const getOngoingTaskOp = new GetOngoingTaskInfoOperation(config.name, "EmbeddingsGeneration");
        const task = await store.maintenance.send(getOngoingTaskOp);

        assertThat(task).isNotNull();
        assertThat(task.taskId).isEqualTo(taskId);
        assertThat(task.taskType).isEqualTo("EmbeddingsGeneration");
        assertThat(task.taskName).isEqualTo(config.name);
    });
});

