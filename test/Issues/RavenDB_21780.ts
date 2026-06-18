import assert from "node:assert";
import { describe, it } from "node:test";
import { assertThrows } from "../Utils/AssertExtensions.js";
import { EnforceRevisionsConfigurationOperation } from "../../src/index.js";

describe("RavenDB_21780", () => {
    it("should throw for maxOpsPerSecond of 0", async () => {
        await assertThrows(
            () => new EnforceRevisionsConfigurationOperation({
                includeForceCreated: false,
                maxOpsPerSecond: 0
            }),
            err => assert.ok(err.message.includes("maxOpsPerSecond"),
                `Expected message to mention maxOpsPerSecond, got: ${err.message}`)
        );
    });

    it("should throw for negative maxOpsPerSecond", async () => {
        await assertThrows(
            () => new EnforceRevisionsConfigurationOperation({
                includeForceCreated: false,
                maxOpsPerSecond: -5
            }),
            err => assert.ok(err.message.includes("maxOpsPerSecond"),
                `Expected message to mention maxOpsPerSecond, got: ${err.message}`)
        );
    });

    it("should not throw for maxOpsPerSecond of 1", () => {
        assert.doesNotThrow(
            () => new EnforceRevisionsConfigurationOperation({
                includeForceCreated: false,
                maxOpsPerSecond: 1
            })
        );
    });

    it("should not throw when maxOpsPerSecond is undefined", () => {
        assert.doesNotThrow(
            () => new EnforceRevisionsConfigurationOperation({
                includeForceCreated: false
            })
        );
    });
});
