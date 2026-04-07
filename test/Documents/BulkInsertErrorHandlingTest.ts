import assert from "node:assert";
import { describe, it } from "node:test";
import { BulkInsertOperation } from "../../src/Documents/BulkInsertOperation.js";

describe("BulkInsertOperation._handleErrors", function () {

    it("should await _getExceptionFromOperation and throw the resolved error", async function () {
        // Create a real BulkInsertOperation instance via Object.create to get
        // the actual prototype chain without invoking the constructor (which
        // needs a full store). Then monkey-patch the one async dependency.
        const instance = Object.create(BulkInsertOperation.prototype) as any;

        const serverError = new Error("Faulted: index out of range");
        serverError.name = "BulkInsertAbortedException";

        // Monkey-patch the real instance's async method to simulate a server error
        instance._getExceptionFromOperation = async () => serverError;

        try {
            await instance._handleErrors("users/1", new Error("write failed"));
            assert.fail("Should have thrown");
        } catch (e: any) {
            // The thrown error should be the server error, not a Promise object
            assert.ok(!(e instanceof Promise), "Should not throw a Promise object");
            assert.strictEqual(e.name, "BulkInsertAbortedException");
            assert.ok(e.message.includes("index out of range"));
        }
    });

    it("should fall through to InvalidOperationException when server returns no error", async function () {
        const instance = Object.create(BulkInsertOperation.prototype) as any;
        instance._getExceptionFromOperation = async () => null;

        try {
            await instance._handleErrors("users/1", new Error("write failed"));
            assert.fail("Should have thrown");
        } catch (e: any) {
            assert.ok(!(e instanceof Promise), "Should not throw a Promise object");
            assert.ok(e.message.includes("Bulk insert error"), "Got: " + e.message);
            assert.ok(e.message.includes("users/1"), "Should mention doc ID");
        }
    });

    it("should rethrow BulkInsertClientException directly", async function () {
        const instance = Object.create(BulkInsertOperation.prototype) as any;
        instance._getExceptionFromOperation = async () => { assert.fail("Should not be called"); };

        const clientError = new Error("client side error");
        clientError.name = "BulkInsertClientException";

        try {
            await instance._handleErrors("users/1", clientError);
            assert.fail("Should have thrown");
        } catch (e: any) {
            assert.strictEqual(e.name, "BulkInsertClientException");
            assert.strictEqual(e.message, "client side error");
        }
    });
});
