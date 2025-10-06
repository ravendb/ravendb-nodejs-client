import {
    AiConnectionString,
    AiSettingsCompareDifferences,
    AzureOpenAiSettings,
    GetConnectionStringsOperation,
    GoogleSettings,
    HuggingFaceSettings,
    IDocumentStore,
    MistralAiSettings,
    OllamaSettings,
    OpenAiSettings,
    PutConnectionStringOperation,
    RemoveConnectionStringOperation,
    VertexSettings
} from "../../src/index.js";
import {disposeTestDocumentStore, RavenTestContext, testContext} from "../Utils/TestUtil.js";
import {assertThat} from "../Utils/AssertExtensions.js";

(RavenTestContext.isRavenDbServerVersion("7.1") ? describe : describe.skip)("RDBC-941 - AI Connection Strings", () => {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canCreateGetAndDeleteOpenAiConnectionString", async () => {
        const aiConnectionString = Object.assign(new AiConnectionString(), {
            name: "openai1",
            type: "Ai",
            modelType: "TextEmbeddings",
            openAiSettings: new OpenAiSettings(
                "test-api-key",
                "https://api.openai.com/",
                "text-embedding-ada-002",
                "org-123",
                "proj-456",
                1536
            )
        });

        const putResult = await store.maintenance.send(new PutConnectionStringOperation(aiConnectionString));
        assertThat(putResult.raftCommandIndex)
            .isGreaterThan(0);

        const connectionStrings = await store.maintenance.send(new GetConnectionStringsOperation());
        assertThat(connectionStrings.aiConnectionStrings)
            .isNotNull()
            .hasSize(1);
        assertThat(connectionStrings.aiConnectionStrings["openai1"] instanceof AiConnectionString)
            .isTrue();

        const retrieved = connectionStrings.aiConnectionStrings["openai1"];
        assertThat(retrieved.name)
            .isEqualTo("openai1");
        assertThat(retrieved.modelType)
            .isEqualTo("TextEmbeddings");
        assertThat(retrieved.openAiSettings)
            .isNotNull();
        assertThat(retrieved.openAiSettings!.apiKey)
            .isEqualTo("test-api-key");
        assertThat(retrieved.openAiSettings!.model)
            .isEqualTo("text-embedding-ada-002");
        assertThat(retrieved.openAiSettings!.organizationId)
            .isEqualTo("org-123");
        assertThat(retrieved.openAiSettings!.projectId)
            .isEqualTo("proj-456");

        await store.maintenance.send(new RemoveConnectionStringOperation(aiConnectionString));

        const afterDelete = await store.maintenance.send(new GetConnectionStringsOperation());
        assertThat(afterDelete.aiConnectionStrings)
            .hasSize(0);
    });

    it("canCreateAzureOpenAiConnectionString", async () => {
        const aiConnectionString = Object.assign(new AiConnectionString(), {
            name: "azure1",
            modelType: "Chat",
            azureOpenAiSettings: new AzureOpenAiSettings(
                "azure-key",
                "https://myresource.openai.azure.com/",
                "gpt-4",
                "my-deployment",
                undefined,
                0.7
            )
        });

        const putResult = await store.maintenance.send(new PutConnectionStringOperation(aiConnectionString));
        assertThat(putResult.raftCommandIndex)
            .isGreaterThan(0);

        const connectionStrings = await store.maintenance.send(new GetConnectionStringsOperation());
        const retrieved = connectionStrings.aiConnectionStrings["azure1"];

        assertThat(retrieved)
            .isNotNull();
        assertThat(retrieved.azureOpenAiSettings)
            .isNotNull();
        assertThat(retrieved.azureOpenAiSettings!.deploymentName)
            .isEqualTo("my-deployment");
        assertThat(retrieved.azureOpenAiSettings!.temperature)
            .isEqualTo(0.7);
    });

    it("canCreateOllamaConnectionString", async () => {
        const aiConnectionString = Object.assign(new AiConnectionString(), {
            name: "ollama1",
            modelType: "Chat",
            ollamaSettings: Object.assign(new OllamaSettings("http://localhost:11434", "llama2"), {
                think: true,
                temperature: 0.8
            })
        });

        const putResult = await store.maintenance.send(new PutConnectionStringOperation(aiConnectionString));
        assertThat(putResult.raftCommandIndex)
            .isGreaterThan(0);

        const connectionStrings = await store.maintenance.send(new GetConnectionStringsOperation());
        const retrieved = connectionStrings.aiConnectionStrings["ollama1"];

        assertThat(retrieved)
            .isNotNull();
        assertThat(retrieved.ollamaSettings)
            .isNotNull();
        assertThat(retrieved.ollamaSettings!.uri)
            .isEqualTo("http://localhost:11434");
        assertThat(retrieved.ollamaSettings!.model)
            .isEqualTo("llama2");
        assertThat(retrieved.ollamaSettings!.think)
            .isTrue();
        assertThat(retrieved.ollamaSettings!.temperature)
            .isEqualTo(0.8);
    });

    it("canCreateGoogleConnectionString", async () => {
        const aiConnectionString = Object.assign(new AiConnectionString(), {
            name: "google1",
            modelType: "TextEmbeddings",
            googleSettings: new GoogleSettings(
                "text-embedding-004",
                "google-api-key",
                "V1",
                768
            )
        });

        const putResult = await store.maintenance.send(new PutConnectionStringOperation(aiConnectionString));
        assertThat(putResult.raftCommandIndex)
            .isGreaterThan(0);

        const connectionStrings = await store.maintenance.send(new GetConnectionStringsOperation());
        const retrieved = connectionStrings.aiConnectionStrings["google1"];

        assertThat(retrieved)
            .isNotNull();
        assertThat(retrieved.googleSettings)
            .isNotNull();
        assertThat(retrieved.googleSettings!.model)
            .isEqualTo("text-embedding-004");
        assertThat(retrieved.googleSettings!.aiVersion)
            .isEqualTo("V1");
        assertThat(retrieved.googleSettings!.dimensions)
            .isEqualTo(768);
    });

    it("canCreateHuggingFaceConnectionString", async () => {
        const aiConnectionString = Object.assign(new AiConnectionString(), {
            name: "huggingface1",
            modelType: "TextEmbeddings",
            huggingFaceSettings: new HuggingFaceSettings(
                "hf-api-key",
                "sentence-transformers/all-MiniLM-L6-v2",
                "https://api-inference.huggingface.co"
            )
        });

        const putResult = await store.maintenance.send(new PutConnectionStringOperation(aiConnectionString));
        assertThat(putResult.raftCommandIndex)
            .isGreaterThan(0);

        const connectionStrings = await store.maintenance.send(new GetConnectionStringsOperation());
        const retrieved = connectionStrings.aiConnectionStrings["huggingface1"];

        assertThat(retrieved)
            .isNotNull();
        assertThat(retrieved.huggingFaceSettings)
            .isNotNull();
        assertThat(retrieved.huggingFaceSettings!.model)
            .isEqualTo("sentence-transformers/all-MiniLM-L6-v2");
        assertThat(retrieved.huggingFaceSettings!.endpoint)
            .isEqualTo("https://api-inference.huggingface.co");
    });

    it("canCreateMistralAiConnectionString", async () => {
        const aiConnectionString = Object.assign(new AiConnectionString(), {
            name: "mistral1",
            modelType: "Chat",
            mistralAiSettings: new MistralAiSettings(
                "mistral-large-latest",
                "mistral-api-key",
                "https://api.mistral.ai"
            )
        });

        const putResult = await store.maintenance.send(new PutConnectionStringOperation(aiConnectionString));
        assertThat(putResult.raftCommandIndex)
            .isGreaterThan(0);

        const connectionStrings = await store.maintenance.send(new GetConnectionStringsOperation());
        const retrieved = connectionStrings.aiConnectionStrings["mistral1"];

        assertThat(retrieved)
            .isNotNull();
        assertThat(retrieved.mistralAiSettings)
            .isNotNull();
        assertThat(retrieved.mistralAiSettings!.model)
            .isEqualTo("mistral-large-latest");
        assertThat(retrieved.mistralAiSettings!.endpoint)
            .isEqualTo("https://api.mistral.ai");
    });

    it("canCreateVertexConnectionString", async () => {
        const credentialsJson = {
            type: "service_account",
            project_id: "my-project-123",
            private_key_id: "key-id",
            private_key: "-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----\n",
            client_email: "test@my-project.iam.gserviceaccount.com",
            client_id: "123456",
            auth_uri: "https://accounts.google.com/o/oauth2/auth",
            token_uri: "https://oauth2.googleapis.com/token"
        };

        const aiConnectionString = Object.assign(new AiConnectionString(), {
            name: "vertex1",
            modelType: "TextEmbeddings",
            vertexSettings: new VertexSettings(
                "text-embedding-004",
                JSON.stringify(credentialsJson),
                "us-central1",
                "V1"
            )
        });

        const putResult = await store.maintenance.send(new PutConnectionStringOperation(aiConnectionString));
        assertThat(putResult.raftCommandIndex)
            .isGreaterThan(0);

        const connectionStrings = await store.maintenance.send(new GetConnectionStringsOperation());
        const retrieved = connectionStrings.aiConnectionStrings["vertex1"];

        assertThat(retrieved)
            .isNotNull();
        assertThat(retrieved.vertexSettings)
            .isNotNull();
        assertThat(retrieved.vertexSettings!.model)
            .isEqualTo("text-embedding-004");
        assertThat(retrieved.vertexSettings!.location)
            .isEqualTo("us-central1");
        assertThat(retrieved.vertexSettings!.aiVersion)
            .isEqualTo("V1");
    });

    it("canGetMultipleAiConnectionStrings", async () => {
        const openAiCs = Object.assign(new AiConnectionString(), {
            name: "openai",
            openAiSettings: new OpenAiSettings("key1", "https://api.openai.com/", "model1")
        });

        const ollamaCs = Object.assign(new AiConnectionString(), {
            name: "ollama",
            ollamaSettings: new OllamaSettings("http://localhost:11434", "llama2")
        });

        await store.maintenance.send(new PutConnectionStringOperation(openAiCs));
        await store.maintenance.send(new PutConnectionStringOperation(ollamaCs));

        const connectionStrings = await store.maintenance.send(new GetConnectionStringsOperation());
        assertThat(connectionStrings.aiConnectionStrings)
            .hasSize(2);
        assertThat(connectionStrings.aiConnectionStrings["openai"])
            .isNotNull();
        assertThat(connectionStrings.aiConnectionStrings["ollama"])
            .isNotNull();
    });

    it("canGetSpecificAiConnectionString", async () => {
        const aiConnectionString = Object.assign(new AiConnectionString(), {
            name: "specific",
            openAiSettings: new OpenAiSettings("key", "https://api.openai.com/", "model")
        });

        await store.maintenance.send(new PutConnectionStringOperation(aiConnectionString));

        const result = await store.maintenance.send(new GetConnectionStringsOperation("specific", "Ai"));
        assertThat(result.aiConnectionStrings)
            .hasSize(1);
        assertThat(result.aiConnectionStrings["specific"])
            .isNotNull();
    });

    it("validationFailsWhenNoProviderConfigured", () => {
        const aiConnectionString = Object.assign(new AiConnectionString(), {
            name: "invalid"
        });

        const errors = aiConnectionString.validate();
        assertThat(errors)
            .isNotEmpty();
        assertThat(errors[0])
            .contains("At least one of the following settings must be set");
    });

    it("validationFailsWhenMultipleProvidersConfigured", () => {
        const aiConnectionString = Object.assign(new AiConnectionString(), {
            name: "invalid",
            openAiSettings: new OpenAiSettings("key1", "https://api.openai.com/", "model1"),
            ollamaSettings: new OllamaSettings("http://localhost:11434", "llama2")
        });

        const errors = aiConnectionString.validate();
        assertThat(errors)
            .isNotEmpty();
        assertThat(errors[0])
            .contains("Only one of the following settings can be set");
    });

    it("validationFailsWhenRequiredFieldsMissing", () => {
        const aiConnectionString = Object.assign(new AiConnectionString(), {
            name: "invalid",
            openAiSettings: new OpenAiSettings("", "", "")
        });

        const errors = aiConnectionString.validate();
        assertThat(errors.length)
            .isGreaterThan(0);
        assertThat(errors.some(e => e.includes("apiKey")))
            .isTrue();
        assertThat(errors.some(e => e.includes("endpoint")))
            .isTrue();
        assertThat(errors.some(e => e.includes("model")))
            .isTrue();
    });

    it("getActiveProviderReturnsCorrectType", () => {
        const cs1 = Object.assign(new AiConnectionString(), {
            openAiSettings: new OpenAiSettings("key", "https://api.openai.com/", "model")
        });
        assertThat(cs1.getActiveProvider())
            .isEqualTo("OpenAi");

        const cs2 = Object.assign(new AiConnectionString(), {
            azureOpenAiSettings: new AzureOpenAiSettings("key", "endpoint", "model", "deployment")
        });
        assertThat(cs2.getActiveProvider())
            .isEqualTo("AzureOpenAi");

        const cs3 = Object.assign(new AiConnectionString(), {
            ollamaSettings: new OllamaSettings("http://localhost:11434", "llama2")
        });
        assertThat(cs3.getActiveProvider())
            .isEqualTo("Ollama");

        const cs4 = new AiConnectionString();
        assertThat(cs4.getActiveProvider())
            .isEqualTo("None");
    });

    it("compareDetectsModelChanges", () => {
        const cs1 = Object.assign(new AiConnectionString(), {
            openAiSettings: new OpenAiSettings("key", "https://api.openai.com/", "model1")
        });

        const cs2 = Object.assign(new AiConnectionString(), {
            openAiSettings: new OpenAiSettings("key", "https://api.openai.com/", "model2")
        });

        const diff = cs1.compare(cs2);
        assertThat(diff & AiSettingsCompareDifferences.ModelArchitecture)
            .isNotEqualTo(0);
    });

    it("compareDetectsEndpointChanges", () => {
        const cs1 = Object.assign(new AiConnectionString(), {
            openAiSettings: new OpenAiSettings("key", "https://api1.openai.com/", "model")
        });

        const cs2 = Object.assign(new AiConnectionString(), {
            openAiSettings: new OpenAiSettings("key", "https://api2.openai.com/", "model")
        });

        const diff = cs1.compare(cs2);
        assertThat(diff & AiSettingsCompareDifferences.EndpointConfiguration)
            .isNotEqualTo(0);
    });

    it("compareDetectsAuthenticationChanges", () => {
        const cs1 = Object.assign(new AiConnectionString(), {
            openAiSettings: new OpenAiSettings("key1", "https://api.openai.com/", "model")
        });

        const cs2 = Object.assign(new AiConnectionString(), {
            openAiSettings: new OpenAiSettings("key2", "https://api.openai.com/", "model")
        });

        const diff = cs1.compare(cs2);
        assertThat(diff & AiSettingsCompareDifferences.AuthenticationSettings)
            .isNotEqualTo(0);
    });

    it("compareDetectsProviderChange", () => {
        const cs1 = Object.assign(new AiConnectionString(), {
            openAiSettings: new OpenAiSettings("key", "https://api.openai.com/", "model")
        });

        const cs2 = Object.assign(new AiConnectionString(), {
            ollamaSettings: new OllamaSettings("http://localhost:11434", "llama2")
        });

        const diff = cs1.compare(cs2);
        assertThat(diff)
            .isEqualTo(AiSettingsCompareDifferences.All);
    });

    it("compareReturnsNoneWhenIdentical", () => {
        const cs1 = Object.assign(new AiConnectionString(), {
            identifier: "id1",
            modelType: "Chat",
            openAiSettings: new OpenAiSettings("key", "https://api.openai.com/", "model")
        });

        const cs2 = Object.assign(new AiConnectionString(), {
            identifier: "id1",
            modelType: "Chat",
            openAiSettings: new OpenAiSettings("key", "https://api.openai.com/", "model")
        });

        const diff = cs1.compare(cs2);
        assertThat(diff)
            .isEqualTo(AiSettingsCompareDifferences.None);
    });

    it("isEqualReturnsTrueForIdenticalConnectionStrings", () => {
        const cs1 = Object.assign(new AiConnectionString(), {
            name: "test",
            identifier: "id1",
            modelType: "Chat",
            openAiSettings: new OpenAiSettings("key", "https://api.openai.com/", "model")
        });

        const cs2 = Object.assign(new AiConnectionString(), {
            name: "test",
            identifier: "id1",
            modelType: "Chat",
            openAiSettings: new OpenAiSettings("key", "https://api.openai.com/", "model")
        });

        assertThat(cs1.isEqual(cs2))
            .isTrue();
    });

    it("isEqualReturnsFalseForDifferentNames", () => {
        const cs1 = Object.assign(new AiConnectionString(), {
            name: "test1",
            openAiSettings: new OpenAiSettings("key", "https://api.openai.com/", "model")
        });

        const cs2 = Object.assign(new AiConnectionString(), {
            name: "test2",
            openAiSettings: new OpenAiSettings("key", "https://api.openai.com/", "model")
        });

        assertThat(cs1.isEqual(cs2))
            .isFalse();
    });

    it("usingEncryptedCommunicationChannelDetectsHttps", () => {
        const cs1 = Object.assign(new AiConnectionString(), {
            openAiSettings: new OpenAiSettings("key", "https://api.openai.com/", "model")
        });
        assertThat(cs1.usingEncryptedCommunicationChannel())
            .isTrue();

        const cs2 = Object.assign(new AiConnectionString(), {
            ollamaSettings: new OllamaSettings("http://localhost:11434", "llama2")
        });
        assertThat(cs2.usingEncryptedCommunicationChannel())
            .isFalse();

        const cs3 = Object.assign(new AiConnectionString(), {
            ollamaSettings: new OllamaSettings("https://secure-ollama.com", "llama2")
        });
        assertThat(cs3.usingEncryptedCommunicationChannel())
            .isTrue();
    });

    it("getQueryEmbeddingsMaxConcurrentBatchesUsesProviderValue", () => {
        const settings = new OpenAiSettings("key", "https://api.openai.com/", "model");
        settings.embeddingsMaxConcurrentBatches = 5;

        const cs = Object.assign(new AiConnectionString(), {
            openAiSettings: settings
        });

        assertThat(cs.getQueryEmbeddingsMaxConcurrentBatches(10))
            .isEqualTo(5);
    });

    it("getQueryEmbeddingsMaxConcurrentBatchesUsesGlobalValueWhenNotSet", () => {
        const cs = Object.assign(new AiConnectionString(), {
            openAiSettings: new OpenAiSettings("key", "https://api.openai.com/", "model")
        });

        assertThat(cs.getQueryEmbeddingsMaxConcurrentBatches(10))
            .isEqualTo(10);
    });

    it("temperatureParameterSerializedCorrectly", async () => {
        const aiConnectionString = Object.assign(new AiConnectionString(), {
            name: "temp-test",
            openAiSettings: Object.assign(
                new OpenAiSettings("key", "https://api.openai.com/", "model"),
                {temperature: 1.5}
            )
        });

        await store.maintenance.send(new PutConnectionStringOperation(aiConnectionString));
        const connectionStrings = await store.maintenance.send(new GetConnectionStringsOperation());
        const retrieved = connectionStrings.aiConnectionStrings["temp-test"];

        assertThat(retrieved.openAiSettings!.temperature)
            .isEqualTo(1.5);
    });

    it("vertexSettingsCanExtractProjectId", () => {
        const credentialsJson = JSON.stringify({
            type: "service_account",
            project_id: "my-test-project",
            private_key_id: "key-id",
            private_key: "test-key"
        });

        const settings = new VertexSettings(
            "text-embedding-004",
            credentialsJson,
            "us-central1"
        );

        assertThat(settings.getProjectId())
            .isEqualTo("my-test-project");
    });

    it("vertexSettingsThrowsWhenProjectIdMissing", () => {
        const credentialsJson = JSON.stringify({
            type: "service_account",
            private_key_id: "key-id"
        });

        const settings = new VertexSettings(
            "text-embedding-004",
            credentialsJson,
            "us-central1"
        );

        let errorThrown = false;
        try {
            settings.getProjectId();
        } catch (e) {
            errorThrown = true;
        }
        assertThat(errorThrown)
            .isTrue();
    });
});
