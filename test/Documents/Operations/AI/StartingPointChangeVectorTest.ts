import assert from "node:assert";
import {StartingPointChangeVector} from "../../../../src/index.js";

describe("StartingPointChangeVector", () => {
    describe("predefined constants", () => {
        it("should have DoNotChange constant", () => {
            assert.ok(StartingPointChangeVector.DoNotChange);
            assert.strictEqual(StartingPointChangeVector.DoNotChange.value, "DoNotChange");
        });

        it("should have LastDocument constant", () => {
            assert.ok(StartingPointChangeVector.LastDocument);
            assert.strictEqual(StartingPointChangeVector.LastDocument.value, "LastDocument");
        });

        it("should have BeginningOfTime constant", () => {
            assert.ok(StartingPointChangeVector.BeginningOfTime);
            assert.strictEqual(StartingPointChangeVector.BeginningOfTime.value, "BeginningOfTime");
        });

        it("constants should be the same instance when accessed multiple times", () => {
            const doNotChange1 = StartingPointChangeVector.DoNotChange;
            const doNotChange2 = StartingPointChangeVector.DoNotChange;
            assert.strictEqual(doNotChange1, doNotChange2);
        });
    });

    describe("from factory method", () => {
        it("should create instance with custom change vector", () => {
            const customVector = "A:123-ABC";
            const instance = StartingPointChangeVector.from(customVector);

            assert.ok(instance);
            assert.strictEqual(instance.value, customVector);
        });

        it("should create different instances for different values", () => {
            const instance1 = StartingPointChangeVector.from("A:123-ABC");
            const instance2 = StartingPointChangeVector.from("B:456-DEF");

            assert.notStrictEqual(instance1, instance2);
            assert.notStrictEqual(instance1.value, instance2.value);
        });

        it("should handle empty string", () => {
            const instance = StartingPointChangeVector.from("");
            assert.strictEqual(instance.value, "");
        });

        it("should handle complex change vectors", () => {
            const complexVector = "A:123-ABC, B:456-DEF, C:789-GHI";
            const instance = StartingPointChangeVector.from(complexVector);
            assert.strictEqual(instance.value, complexVector);
        });
    });

    describe("value property", () => {
        it("should be readonly (type check)", () => {
            const instance = StartingPointChangeVector.LastDocument;
            // TypeScript should prevent: instance.value = "new value";
            // This is a compile-time check, runtime we just verify it exists
            assert.strictEqual(typeof instance.value, "string");
        });

        it("should have string type matching union", () => {
            const doNotChange = StartingPointChangeVector.DoNotChange;
            const lastDocument = StartingPointChangeVector.LastDocument;
            const beginningOfTime = StartingPointChangeVector.BeginningOfTime;
            const custom = StartingPointChangeVector.from("A:123-ABC");

            assert.strictEqual(typeof doNotChange.value, "string");
            assert.strictEqual(typeof lastDocument.value, "string");
            assert.strictEqual(typeof beginningOfTime.value, "string");
            assert.strictEqual(typeof custom.value, "string");
        });
    });

    describe("usage in operations", () => {
        it("should be usable in URL encoding", () => {
            const vector = StartingPointChangeVector.LastDocument;
            const encoded = encodeURIComponent(vector.value);
            assert.strictEqual(encoded, "LastDocument");
        });

        it("should handle special characters in custom vectors", () => {
            const vector = StartingPointChangeVector.from("A:123-ABC, B:456-DEF");
            const encoded = encodeURIComponent(vector.value);
            assert.ok(encoded.includes("%"));
        });

        it("predefined constants should match expected string literals", () => {
            // These are the exact values expected by the server
            assert.strictEqual(StartingPointChangeVector.DoNotChange.value, "DoNotChange");
            assert.strictEqual(StartingPointChangeVector.LastDocument.value, "LastDocument");
            assert.strictEqual(StartingPointChangeVector.BeginningOfTime.value, "BeginningOfTime");
        });
    });
});

