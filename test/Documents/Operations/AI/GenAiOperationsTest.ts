import assert from "node:assert";
import {
    AddGenAiOperation,
    DocumentConventions,
    GenAiConfiguration,
    GenAiTransformation,
    StartingPointChangeVector,
    UpdateGenAiOperation
} from "../../../../src/index.js";


describe("GenAI Operations", () => {
    describe("AddGenAiOperation", () => {
        it("should create operation with configuration", () => {
            const config = createValidConfiguration();
            const operation = new AddGenAiOperation(config);

            assert.ok(operation);
            assert.strictEqual(operation.resultType, "CommandResult");
        });

        it("should create operation with custom starting point", () => {
            const config = createValidConfiguration();
            const operation = new AddGenAiOperation(
                config,
                StartingPointChangeVector.BeginningOfTime
            );

            assert.ok(operation);
        });

        it("should default to LastDocument starting point", () => {
            const config = createValidConfiguration();
            const operation = new AddGenAiOperation(config);

            const conventions = new DocumentConventions();
            const command = operation.getCommand(conventions);

            assert.ok(command);
        });

        it("should throw error for null configuration", () => {
            assert.throws(() => {
                new AddGenAiOperation(null);
            }, /Configuration cannot be null/);
        });

        it("should create command with conventions", () => {
            const config = createValidConfiguration();
            const operation = new AddGenAiOperation(config);
            const conventions = new DocumentConventions();

            const command = operation.getCommand(conventions);

            assert.ok(command);
            assert.strictEqual(command.isReadRequest, false);
        });

        it("should generate raft unique request id", () => {
            const config = createValidConfiguration();
            const operation = new AddGenAiOperation(config);
            const conventions = new DocumentConventions();
            const command = operation.getCommand(conventions) as any;

            const requestId = command.getRaftUniqueRequestId();
            assert.ok(requestId);
            assert.strictEqual(typeof requestId, "string");
            assert.ok(requestId.length > 0);
        });

        it("should create proper HTTP request", () => {
            const config = createValidConfiguration();
            const operation = new AddGenAiOperation(
                config,
                StartingPointChangeVector.LastDocument
            );
            const conventions = new DocumentConventions();
            const command = operation.getCommand(conventions) as any;

            const node = {
                url: "http://localhost:8080",
                database: "TestDB"
            };

            const request = command.createRequest(node);

            assert.ok(request);
            assert.strictEqual(request.method, "PUT");
            assert.ok(request.uri.includes("/admin/etl"));
            assert.ok(request.uri.includes("changeVector="));
            assert.ok(request.uri.includes("LastDocument"));
            assert.ok(request.body);
            assert.ok(request.headers);
        });

        it("should URL encode change vector in request", () => {
            const config = createValidConfiguration();
            const customVector = StartingPointChangeVector.from("A:123-ABC, B:456-DEF");
            const operation = new AddGenAiOperation(config, customVector);
            const conventions = new DocumentConventions();
            const command = operation.getCommand(conventions) as any;

            const node = {
                url: "http://localhost:8080",
                database: "TestDB"
            };

            const request = command.createRequest(node);

            assert.ok(request.uri.includes("changeVector="));
            // The comma and space should be encoded
            assert.ok(request.uri.includes("%"));
        });

        it("should serialize configuration in request body", () => {
            const config = createValidConfiguration();
            config.maxConcurrency = 8;
            config.enableTracing = true;

            const operation = new AddGenAiOperation(config);
            const conventions = new DocumentConventions();
            const command = operation.getCommand(conventions) as any;

            const node = {
                url: "http://localhost:8080",
                database: "TestDB"
            };

            const request = command.createRequest(node);
            const body = JSON.parse(request.body);

            assert.strictEqual(body.MaxConcurrency, 8);
            assert.strictEqual(body.EnableTracing, true);
            assert.strictEqual(body.EtlType, "GenAi");
        });
    });

    describe("UpdateGenAiOperation", () => {
        it("should create operation with task id and configuration", () => {
            const config = createValidConfiguration();
            const operation = new UpdateGenAiOperation(123, config);

            assert.ok(operation);
            assert.strictEqual(operation.resultType, "CommandResult");
        });

        it("should default to DoNotChange starting point", () => {
            const config = createValidConfiguration();
            const operation = new UpdateGenAiOperation(123, config);

            const conventions = new DocumentConventions();
            const command = operation.getCommand(conventions);

            assert.ok(command);
        });

        it("should support reset flag", () => {
            const config = createValidConfiguration();
            const operation = new UpdateGenAiOperation(
                123,
                config,
                StartingPointChangeVector.BeginningOfTime,
                true // reset
            );

            assert.ok(operation);
        });

        it("should throw error for null configuration", () => {
            assert.throws(() => {
                new UpdateGenAiOperation(123, null);
            }, /Configuration cannot be null/);
        });

        it("should create proper HTTP request with task id", () => {
            const config = createValidConfiguration();
            const taskId = 456;
            const operation = new UpdateGenAiOperation(taskId, config);
            const conventions = new DocumentConventions();
            const command = operation.getCommand(conventions) as any;

            const node = {
                url: "http://localhost:8080",
                database: "TestDB"
            };

            const request = command.createRequest(node);

            assert.ok(request);
            assert.strictEqual(request.method, "PUT");
            assert.ok(request.uri.includes("/admin/etl"));
            assert.ok(request.uri.includes(`id=${taskId}`));
            assert.ok(request.uri.includes("changeVector="));
        });

        it("should include TransformationsToReset when reset is true", () => {
            const config = createValidConfiguration();
            const operation = new UpdateGenAiOperation(
                123,
                config,
                StartingPointChangeVector.DoNotChange,
                true // reset
            );
            const conventions = new DocumentConventions();
            const command = operation.getCommand(conventions) as any;

            const node = {
                url: "http://localhost:8080",
                database: "TestDB"
            };

            const request = command.createRequest(node);
            const body = JSON.parse(request.body);

            assert.ok(body.TransformationsToReset);
            assert.ok(Array.isArray(body.TransformationsToReset));
            assert.strictEqual(body.TransformationsToReset.length, 1);
            assert.strictEqual(body.TransformationsToReset[0], "GenAi-transform-script");
        });

        it("should not include TransformationsToReset when reset is false", () => {
            const config = createValidConfiguration();
            const operation = new UpdateGenAiOperation(
                123,
                config,
                StartingPointChangeVector.DoNotChange,
                false // no reset
            );
            const conventions = new DocumentConventions();
            const command = operation.getCommand(conventions) as any;

            const node = {
                url: "http://localhost:8080",
                database: "TestDB"
            };

            const request = command.createRequest(node);
            const body = JSON.parse(request.body);

            assert.strictEqual(body.TransformationsToReset, undefined);
        });

        it("should use DoNotChange by default", () => {
            const config = createValidConfiguration();
            const operation = new UpdateGenAiOperation(123, config);
            const conventions = new DocumentConventions();
            const command = operation.getCommand(conventions) as any;

            const node = {
                url: "http://localhost:8080",
                database: "TestDB"
            };

            const request = command.createRequest(node);

            assert.ok(request.uri.includes("DoNotChange"));
        });

        it("should generate raft unique request id", () => {
            const config = createValidConfiguration();
            const operation = new UpdateGenAiOperation(123, config);
            const conventions = new DocumentConventions();
            const command = operation.getCommand(conventions) as any;

            const requestId = command.getRaftUniqueRequestId();
            assert.ok(requestId);
            assert.strictEqual(typeof requestId, "string");
            assert.ok(requestId.length > 0);
        });
    });

    describe("Operation comparison", () => {
        it("AddGenAiOperation and UpdateGenAiOperation should have different request URLs", () => {
            const config = createValidConfiguration();
            const addOp = new AddGenAiOperation(config);
            const updateOp = new UpdateGenAiOperation(123, config);

            const conventions = new DocumentConventions();
            const addCommand = addOp.getCommand(conventions) as any;
            const updateCommand = updateOp.getCommand(conventions) as any;

            const node = {
                url: "http://localhost:8080",
                database: "TestDB"
            };

            const addRequest = addCommand.createRequest(node);
            const updateRequest = updateCommand.createRequest(node);

            // Add operation doesn't have id parameter
            assert.ok(!addRequest.uri.includes("id="));
            // Update operation has id parameter
            assert.ok(updateRequest.uri.includes("id="));
        });

        it("both operations should use PUT method", () => {
            const config = createValidConfiguration();
            const addOp = new AddGenAiOperation(config);
            const updateOp = new UpdateGenAiOperation(123, config);

            const conventions = new DocumentConventions();
            const addCommand = addOp.getCommand(conventions) as any;
            const updateCommand = updateOp.getCommand(conventions) as any;

            const node = {
                url: "http://localhost:8080",
                database: "TestDB"
            };

            const addRequest = addCommand.createRequest(node);
            const updateRequest = updateCommand.createRequest(node);

            assert.strictEqual(addRequest.method, "PUT");
            assert.strictEqual(updateRequest.method, "PUT");
        });
    });
});

function createValidConfiguration(): GenAiConfiguration {
    const config = new GenAiConfiguration();
    config.testMode = true;
    config.name = "TestTask";
    config.collection = "Products";
    config.identifier = "test-task";
    config.prompt = "Test prompt";
    config.sampleObject = JSON.stringify({result: "string"});
    config.updateScript = "function update(doc, result) { return doc; }";

    const transformation = new GenAiTransformation();
    transformation.script = "ai.genContext({ test: 'data' });";
    config.genAiTransformation = transformation;

    return config;
}

