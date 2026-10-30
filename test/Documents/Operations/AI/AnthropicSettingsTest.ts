import assert from "node:assert";
import { AiConnectionString, AiSettingsCompareDifferences, AnthropicSettings } from "../../../../src/index.js";

describe("AnthropicSettings", () => {
    describe("validation", () => {
        it("should accept api key and model", () => {
            const errors: string[] = [];
            new AnthropicSettings("test-api-key", "claude-test-model").validate(errors);
            assert.strictEqual(errors.length, 0, `Expected no errors, but got: ${errors.join(", ")}`);
        });

        it("should require api key and model", () => {
            const errors: string[] = [];
            new AnthropicSettings("", " ").validate(errors);
            assert.ok(errors.some(e => e.includes("apiKey")));
            assert.ok(errors.some(e => e.includes("model")));
        });

        it("should require positive maxOutputTokens", () => {
            const errors: string[] = [];
            new AnthropicSettings("test-api-key", "claude-test-model", undefined, 0).validate(errors);
            assert.ok(errors.some(e => e.includes("maxOutputTokens")));
        });
    });

    describe("getBaseEndpointUri", () => {
        it("should use the default endpoint when none is set", () => {
            assert.strictEqual(new AnthropicSettings("key", "model").getBaseEndpointUri(), "https://api.anthropic.com/v1/");
        });

        it("should add the version segment to the documented base url", () => {
            assert.strictEqual(new AnthropicSettings("key", "model", "https://api.anthropic.com").getBaseEndpointUri(), "https://api.anthropic.com/v1/");
        });

        it("should keep a custom endpoint", () => {
            assert.strictEqual(new AnthropicSettings("key", "model", "https://proxy.example.com/anthropic").getBaseEndpointUri(), "https://proxy.example.com/anthropic/");
        });
    });

    describe("compare", () => {
        it("should report the changed settings", () => {
            const settings = new AnthropicSettings("key", "model");

            assert.strictEqual(settings.compare(new AnthropicSettings("key", "model")), AiSettingsCompareDifferences.None);
            assert.strictEqual(settings.compare(new AnthropicSettings("other-key", "model")), AiSettingsCompareDifferences.AuthenticationSettings);
            assert.strictEqual(settings.compare(new AnthropicSettings("key", "other-model")), AiSettingsCompareDifferences.ModelArchitecture);
            assert.strictEqual(settings.compare(new AnthropicSettings("key", "model", undefined, 1000)), AiSettingsCompareDifferences.EndpointConfiguration);
            assert.strictEqual(settings.compare(new AnthropicSettings("key", "model", undefined, undefined, "high")), AiSettingsCompareDifferences.EndpointConfiguration);
        });
    });

    describe("AiConnectionString", () => {
        it("should use Anthropic as the active provider", () => {
            const connectionString = Object.assign(new AiConnectionString(), {
                name: "anthropic",
                modelType: "Chat",
                anthropicSettings: new AnthropicSettings("key", "model")
            });

            assert.strictEqual(connectionString.getActiveProvider(), "Anthropic");
            assert.strictEqual(connectionString.usingEncryptedCommunicationChannel(), true);
            assert.strictEqual(connectionString.validate().length, 0);
        });

        it("should reject the TextEmbeddings model type", () => {
            const connectionString = Object.assign(new AiConnectionString(), {
                name: "anthropic",
                modelType: "TextEmbeddings",
                anthropicSettings: new AnthropicSettings("key", "model")
            });

            const errors = connectionString.validate();
            assert.ok(errors.some(e => e.includes("'Anthropic' does not support the 'TextEmbeddings' model type")));
        });

        it("should list anthropicSettings when no provider is set", () => {
            const errors = Object.assign(new AiConnectionString(), { name: "none", modelType: "Chat" }).validate();
            assert.ok(errors.some(e => e.includes("anthropicSettings")));
        });
    });
});
