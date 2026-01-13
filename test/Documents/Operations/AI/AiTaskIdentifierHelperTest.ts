import assert from "node:assert";
import {AiTaskIdentifierHelper} from "../../../../src/index.js";

describe("AiTaskIdentifierHelper", () => {
    describe("validateIdentifier", () => {
        it("should accept valid identifiers", () => {
            const validIdentifiers = [
                "my-task",
                "product-enricher",
                "task-123",
                "a",
                "test-task-name-123"
            ];

            for (const identifier of validIdentifiers) {
                const errors = AiTaskIdentifierHelper.validateIdentifier(identifier);
                assert.strictEqual(errors.length, 0, `Expected '${identifier}' to be valid, but got errors: ${errors.join(", ")}`);
            }
        });

        it("should reject empty or whitespace-only identifiers", () => {
            const invalidIdentifiers = ["", "   ", "\t", "\n"];

            for (const identifier of invalidIdentifiers) {
                const errors = AiTaskIdentifierHelper.validateIdentifier(identifier);
                assert.ok(errors.length > 0, `Expected '${identifier}' to be invalid`);
                assert.ok(errors[0].includes("empty"), `Expected error message about empty identifier`);
            }
        });

        it("should reject identifiers with uppercase letters", () => {
            const errors = AiTaskIdentifierHelper.validateIdentifier("MyTask");
            assert.ok(errors.length > 0);
            assert.ok(errors.some(e => e.includes("uppercase")));
        });

        it("should reject identifiers with invalid characters", () => {
            const invalidIdentifiers = [
                "task_name",
                "task name",
                "task@name",
                "task.name",
                "task/name"
            ];

            for (const id of invalidIdentifiers) {
                const errors = AiTaskIdentifierHelper.validateIdentifier(id);
                assert.ok(errors.length > 0, `Expected '${id}' to be invalid`);
                assert.ok(errors.some(e => e.includes("invalid characters")), `Expected error about invalid characters for '${id}'`);
            }
        });

        it("should reject identifiers with consecutive hyphens", () => {
            const errors = AiTaskIdentifierHelper.validateIdentifier("task--name");
            assert.ok(errors.length > 0);
            assert.ok(errors.some(e => e.includes("consecutive hyphens")));
        });

        it("should reject identifiers ending with hyphen", () => {
            const errors = AiTaskIdentifierHelper.validateIdentifier("task-name-");
            assert.ok(errors.length > 0);
            assert.ok(errors.some(e => e.includes("ends with a hyphen")));
        });

        it("should reject identifiers with diacritical marks", () => {
            const errors = AiTaskIdentifierHelper.validateIdentifier("tâsk-näme");
            assert.ok(errors.length > 0);
            assert.ok(errors.some(e => e.includes("diacritical marks") || e.includes("non-ASCII")));
        });

        it("should allow identifiers with only numbers", () => {
            const errors = AiTaskIdentifierHelper.validateIdentifier("123");
            assert.strictEqual(errors.length, 0);
        });

        it("should allow identifiers with hyphens in the middle", () => {
            const errors = AiTaskIdentifierHelper.validateIdentifier("task-name-123");
            assert.strictEqual(errors.length, 0);
        });
    });

    describe("generateIdentifier", () => {
        it("should generate valid identifiers from simple strings", () => {
            const testCases = [
                { input: "MyTask", expected: "mytask" },
                { input: "Product Enricher", expected: "product-enricher" },
                { input: "TASK_123", expected: "task-123" },
                { input: "Task@Name", expected: "task-name" }
            ];

            for (const { input, expected } of testCases) {
                const result = AiTaskIdentifierHelper.generateIdentifier(input);
                assert.strictEqual(result, expected, `Expected '${input}' to generate '${expected}', but got '${result}'`);
            }
        });

        it("should convert uppercase to lowercase", () => {
            const result = AiTaskIdentifierHelper.generateIdentifier("UPPERCASE");
            assert.strictEqual(result, "uppercase");
        });

        it("should replace invalid characters with hyphens", () => {
            const result = AiTaskIdentifierHelper.generateIdentifier("task@name#test");
            assert.strictEqual(result, "task-name-test");
        });

        it("should remove consecutive hyphens", () => {
            const result = AiTaskIdentifierHelper.generateIdentifier("task___name");
            assert.strictEqual(result, "task-name");
        });

        it("should trim trailing hyphens", () => {
            const result = AiTaskIdentifierHelper.generateIdentifier("task-name@@@");
            assert.strictEqual(result, "task-name");
        });

        it("should return default identifier for empty input", () => {
            const result = AiTaskIdentifierHelper.generateIdentifier("");
            assert.strictEqual(result, "AiConnectionStringIdentifier");
        });

        it("should return default identifier for whitespace-only input", () => {
            const result = AiTaskIdentifierHelper.generateIdentifier("   ");
            assert.strictEqual(result, "AiConnectionStringIdentifier");
        });

        it("should return default identifier for input with only invalid characters", () => {
            const result = AiTaskIdentifierHelper.generateIdentifier("@@@###$$$");
            assert.strictEqual(result, "AiConnectionStringIdentifier");
        });

        it("should generate identifier that passes validation", () => {
            const inputs = [
                "My Product Task",
                "TASK 123",
                "Test@Task#Name",
                "Tâsk-Näme_123"
            ];

            for (const input of inputs) {
                const generated = AiTaskIdentifierHelper.generateIdentifier(input);
                const errors = AiTaskIdentifierHelper.validateIdentifier(generated);
                assert.strictEqual(errors.length, 0, `Generated identifier '${generated}' from '${input}' should be valid, but got errors: ${errors.join(", ")}`);
            }
        });

        it("should handle multiple spaces", () => {
            const result = AiTaskIdentifierHelper.generateIdentifier("task    name    test");
            assert.strictEqual(result, "task-name-test");
        });

        it("should preserve numbers", () => {
            const result = AiTaskIdentifierHelper.generateIdentifier("task123name456");
            assert.strictEqual(result, "task123name456");
        });
    });
});

