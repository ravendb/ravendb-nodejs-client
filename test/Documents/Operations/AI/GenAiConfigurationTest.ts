import assert from "node:assert";
import {AiConnectionString, DocumentConventions, GenAiConfiguration, GenAiTransformation} from "../../../../src/index.js";


describe("GenAiConfiguration", () => {
    describe("validation", () => {
        it("should validate complete configuration successfully", () => {
            const config = createValidConfiguration();

            const errors = config.validate({ validateName: false, validateConnection: false, validateIdentifier: false });
            assert.strictEqual(errors.length, 0, `Expected no errors, but got: ${errors.join(", ")}`);
        });

        it("should require name when validateName is true", () => {
            const config = new GenAiConfiguration();
            config.collection = "Products";
            config.identifier = "test";
            config.genAiTransformation = createValidTransformation();

            const errors = config.validate({ validateName: true, validateConnection: false, validateIdentifier: false });
            assert.ok(errors.length > 0);
            assert.ok(errors.some(e => e.includes("Name")));
        });

        it("should require collection", () => {
            const config = new GenAiConfiguration();
            config.name = "Test";
            config.identifier = "test";
            config.genAiTransformation = createValidTransformation();

            const errors = config.validate({ validateName: false, validateConnection: false, validateIdentifier: false });
            assert.ok(errors.length > 0);
            assert.ok(errors.some(e => e.includes("Collection")));
        });

        it("should require genAiTransformation", () => {
            const config = new GenAiConfiguration();
            config.name = "Test";
            config.collection = "Products";
            config.identifier = "test";

            const errors = config.validate({ validateName: false, validateConnection: false, validateIdentifier: false });
            assert.ok(errors.length > 0);
            assert.ok(errors.some(e => e.includes("GenAiTransformation")));
        });

        it("should validate genAiTransformation script", () => {
            const config = new GenAiConfiguration();
            config.name = "Test";
            config.collection = "Products";
            config.identifier = "test";
            config.genAiTransformation = new GenAiTransformation();
            config.genAiTransformation.script = "invalid script without ai-genContext";

            const errors = config.validate({ validateName: false, validateConnection: false, validateIdentifier: false });
            assert.ok(errors.length > 0);
            assert.ok(errors.some(e => e.includes("ai.genContext")));
        });

        it("should validate identifier when validateIdentifier is true", () => {
            const config = new GenAiConfiguration();
            config.name = "Test";
            config.collection = "Products";
            config.identifier = "Invalid_Identifier"; // underscore is invalid
            config.genAiTransformation = createValidTransformation();

            const errors = config.validate({ validateName: false, validateConnection: false, validateIdentifier: true });
            assert.ok(errors.length > 0);
            assert.ok(errors.some(e => e.includes("invalid characters")));
        });

        it("should require prompt in non-test mode", () => {
            const config = createValidConfiguration();
            config.testMode = false;
            config.prompt = "";

            const errors = config.validate({ validateName: false, validateConnection: false, validateIdentifier: false });
            assert.ok(errors.length > 0);
            assert.ok(errors.some(e => e.includes("Prompt")));
        });

        it("should require jsonSchema or sampleObject in non-test mode", () => {
            const config = createValidConfiguration();
            config.testMode = false;
            config.jsonSchema = "";
            config.sampleObject = "";

            const errors = config.validate({ validateName: false, validateConnection: false, validateIdentifier: false });
            assert.ok(errors.length > 0);
            assert.ok(errors.some(e => e.includes("JSON schema") || e.includes("sample object")));
        });

        it("should require updateScript in non-test mode", () => {
            const config = createValidConfiguration();
            config.testMode = false;
            config.updateScript = "";

            const errors = config.validate({ validateName: false, validateConnection: false, validateIdentifier: false });
            assert.ok(errors.length > 0);
            assert.ok(errors.some(e => e.includes("update function")));
        });

        it("should skip some validations in test mode", () => {
            const config = new GenAiConfiguration();
            config.testMode = true;
            config.name = "Test";
            config.collection = "Products";
            config.identifier = "test";
            config.genAiTransformation = createValidTransformation();
            // No prompt, schema, or updateScript

            const errors = config.validate({ validateName: false, validateConnection: false, validateIdentifier: false });
            assert.strictEqual(errors.length, 0);
        });

        it("should require connectionStringName in non-test mode", () => {
            const config = createValidConfiguration();
            config.testMode = false;
            config.connectionStringName = "";

            const errors = config.validate({ validateName: false, validateConnection: false, validateIdentifier: false });
            assert.ok(errors.length > 0);
            assert.ok(errors.some(e => e.includes("ConnectionStringName")));
        });
    });

    describe("serialization", () => {
        it("should serialize all properties with PascalCase", () => {
            const config = createValidConfiguration();
            config.maxConcurrency = 8;
            config.enableTracing = true;
            config.expirationInSec = 3600;

            const conventions = new DocumentConventions();
            const json = config.serialize(conventions) as any;

            assert.strictEqual(json.Name, config.name);
            assert.strictEqual(json.Collection, config.collection);
            assert.strictEqual(json.Identifier, config.identifier);
            assert.strictEqual(json.Prompt, config.prompt);
            assert.strictEqual(json.SampleObject, config.sampleObject);
            assert.strictEqual(json.UpdateScript, config.updateScript);
            assert.strictEqual(json.MaxConcurrency, config.maxConcurrency);
            assert.strictEqual(json.EnableTracing, config.enableTracing);
            assert.strictEqual(json.ExpirationInSec, config.expirationInSec);
            assert.strictEqual(json.EtlType, "GenAi");
            assert.ok(json.GenAiTransformation);
            assert.ok(json.Transforms);
            assert.ok(Array.isArray(json.Transforms));
        });

        it("should populate transforms array from genAiTransformation", () => {
            const config = createValidConfiguration();
            const conventions = new DocumentConventions();
            const json = config.serialize(conventions) as any;

            assert.ok(json.Transforms);
            assert.strictEqual(json.Transforms.length, 1);
            assert.strictEqual(json.Transforms[0].Name, "GenAi-transform-script");
            assert.strictEqual(json.Transforms[0].Collections[0], config.collection);
        });

        it("should serialize queries array", () => {
            const config = createValidConfiguration();
            config.queries = [
                {
                    name: "TestQuery",
                    description: "Test query description",
                    query: "from Products where Category = $category",
                    parametersSchema: JSON.stringify({type: "object"})
                }
            ];

            const conventions = new DocumentConventions();
            const json = config.serialize(conventions) as any;

            assert.ok(json.Queries);
            assert.strictEqual(json.Queries.length, 1);
            assert.strictEqual(json.Queries[0].Name, "TestQuery");
            assert.strictEqual(json.Queries[0].Description, "Test query description");
            assert.strictEqual(json.Queries[0].Query, "from Products where Category = $category");
        });

        it("should serialize query options with PascalCase", () => {
            const config = createValidConfiguration();
            config.queries = [
                {
                    name: "TestQuery",
                    description: "Test",
                    query: "from Products",
                    options: {
                        allowModelQueries: true,
                        addToInitialContext: false
                    }
                }
            ];

            const conventions = new DocumentConventions();
            const json = config.serialize(conventions) as any;

            assert.ok(json.Queries[0].Options);
            assert.strictEqual(json.Queries[0].Options.AllowModelQueries, true);
            assert.strictEqual(json.Queries[0].Options.AddToInitialContext, false);
        });

        it("should handle null queries array", () => {
            const config = createValidConfiguration();
            config.queries = null;

            const conventions = new DocumentConventions();
            const json = config.serialize(conventions) as any;

            assert.strictEqual(json.Queries, null);
        });
    });

    describe("properties", () => {
        it("should return identifier as destination", () => {
            const config = new GenAiConfiguration();
            config.identifier = "test-identifier";
            assert.strictEqual(config.getDestination(), "test-identifier");
        });

        it("should return identifier as default task name", () => {
            const config = new GenAiConfiguration();
            config.identifier = "test-identifier";
            assert.strictEqual(config.getDefaultTaskName(), "test-identifier");
        });

        it("should generate identifier from name", () => {
            const config = new GenAiConfiguration();
            config.name = "My Product Task";
            const generated = config.generateIdentifier();
            assert.strictEqual(generated, "my-product-task");
        });
    });

    describe("aiConnectorType", () => {
        it("should return None when no connection", () => {
            const config = new GenAiConfiguration();
            assert.strictEqual(config.aiConnectorType, "None");
        });

        it("should return connector type from connection", () => {
            const config = new GenAiConfiguration();
            const connection = new AiConnectionString();
            connection.openAiSettings = {apiKey: "test"} as any;
            config.connection = connection;

            assert.strictEqual(config.aiConnectorType, "OpenAi");
        });
    });
});

function createValidConfiguration(): GenAiConfiguration {
    const config = new GenAiConfiguration();
    config.testMode = true; // Skip some validations
    config.name = "TestTask";
    config.collection = "Products";
    config.identifier = "test-task";
    config.prompt = "Test prompt";
    config.sampleObject = JSON.stringify({result: "string"});
    config.updateScript = "function update(doc, result) { return doc; }";
    config.genAiTransformation = createValidTransformation();

    return config;
}

function createValidTransformation(): GenAiTransformation {
    const transformation = new GenAiTransformation();
    transformation.script = "ai.genContext({ test: 'data' });";
    return transformation;
}

