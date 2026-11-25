import assert from "node:assert";
import {
    AiConnectionString,
    AiSettingsCompareDifferences,
    AzureOpenAiSettings,
    GetConnectionStringsOperation,
    IDocumentStore,
    OllamaSettings,
    OpenAiSettings,
    PutConnectionStringOperation
} from "../../../src/index.js";
import { disposeTestDocumentStore, RavenTestContext, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

describe("RavenDB_27378 settings", () => {

    it("chatApiAndReasoningEffortAreEndpointConfigurationChanges", () => {
        const openAi = new OpenAiSettings("key", "https://api.openai.com/", "gpt");
        const openAiResponses = Object.assign(new OpenAiSettings("key", "https://api.openai.com/", "gpt"), { chatApi: "Responses" });
        const openAiEffort = new OpenAiSettings("key", "https://api.openai.com/", "gpt", undefined, undefined, undefined, undefined, undefined, "low");

        assert.strictEqual(openAi.compare(new OpenAiSettings("key", "https://api.openai.com/", "gpt")), AiSettingsCompareDifferences.None);
        assert.strictEqual(openAi.compare(openAiResponses), AiSettingsCompareDifferences.EndpointConfiguration);
        assert.strictEqual(openAi.compare(openAiEffort), AiSettingsCompareDifferences.EndpointConfiguration);

        const azure = new AzureOpenAiSettings("key", "https://test.openai.azure.com/", "gpt", "deployment");
        const azureChat = Object.assign(new AzureOpenAiSettings("key", "https://test.openai.azure.com/", "gpt", "deployment"), {
            chatApi: "ChatCompletions",
            reasoningEffort: "high"
        });

        assert.strictEqual(azure.compare(azureChat), AiSettingsCompareDifferences.EndpointConfiguration);
    });

    it("ollamaApiKeyChatApiAndReasoningEffortAreCompared", () => {
        const ollama = new OllamaSettings("http://localhost:11434", "llama3.2");

        assert.strictEqual(ollama.compare(new OllamaSettings("http://localhost:11434", "llama3.2")), AiSettingsCompareDifferences.None);
        assert.strictEqual(ollama.compare(Object.assign(new OllamaSettings("http://localhost:11434", "llama3.2"), { apiKey: "key" })),
            AiSettingsCompareDifferences.AuthenticationSettings);
        assert.strictEqual(ollama.compare(Object.assign(new OllamaSettings("http://localhost:11434", "llama3.2"), { chatApi: "Responses" })),
            AiSettingsCompareDifferences.EndpointConfiguration);
        assert.strictEqual(ollama.compare(Object.assign(new OllamaSettings("http://localhost:11434", "llama3.2"), { reasoningEffort: "low" })),
            AiSettingsCompareDifferences.EndpointConfiguration);
    });

    it("ollamaIsStillValidWithoutAnApiKey", () => {
        const errors: string[] = [];
        new OllamaSettings("http://localhost:11434", "llama3.2").validate(errors);
        assert.strictEqual(errors.length, 0, `Expected no errors, but got: ${errors.join(", ")}`);
    });
});

(RavenTestContext.isRavenDbServerVersion("7.2") && !RavenTestContext.isPullRequest ? describe : describe.skip)("RavenDB_27378", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("chatApiAndReasoningEffortSurviveSave", async () => {
        const openAi = Object.assign(new AiConnectionString(), {
            name: "openai",
            modelType: "Chat",
            openAiSettings: Object.assign(new OpenAiSettings("key", "https://api.openai.com/", "gpt"), {
                chatApi: "ChatCompletions",
                reasoningEffort: "low"
            })
        });

        const ollama = Object.assign(new AiConnectionString(), {
            name: "ollama",
            modelType: "Chat",
            ollamaSettings: Object.assign(new OllamaSettings("http://localhost:11434", "llama3.2"), {
                apiKey: "proxy-key",
                chatApi: "Responses",
                reasoningEffort: "high"
            })
        });

        await store.maintenance.send(new PutConnectionStringOperation(openAi));
        await store.maintenance.send(new PutConnectionStringOperation(ollama));

        const connectionStrings = (await store.maintenance.send(new GetConnectionStringsOperation())).aiConnectionStrings;

        const savedOpenAi = connectionStrings["openai"].openAiSettings;
        assertThat(savedOpenAi.chatApi).isEqualTo("ChatCompletions");
        assertThat(savedOpenAi.reasoningEffort).isEqualTo("low");

        const savedOllama = connectionStrings["ollama"].ollamaSettings;
        assertThat(savedOllama.uri).isEqualTo("http://localhost:11434");
        assertThat(savedOllama.apiKey).isEqualTo("proxy-key");
        assertThat(savedOllama.chatApi).isEqualTo("Responses");
        assertThat(savedOllama.reasoningEffort).isEqualTo("high");
    });
});
