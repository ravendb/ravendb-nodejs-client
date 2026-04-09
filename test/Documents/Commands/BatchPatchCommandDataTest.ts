import assert from "node:assert";
import { describe, it } from "node:test";
import { BatchPatchCommandData } from "../../../src/Documents/Commands/Batches/BatchPatchCommandData.js";
import { PatchRequest } from "../../../src/Documents/Operations/PatchRequest.js";

describe("BatchPatchCommandData", function () {

    it("should reject duplicate document IDs", function () {
        const patch = PatchRequest.forScript("this.name = 'test';");

        assert.throws(() => {
            new BatchPatchCommandData(patch, null as any, "companies/1", "companies/1");
        }, (err: Error) => {
            return err.message.includes("item with the same ID was already added");
        });
    });

    it("should reject duplicate IDs case-insensitively", function () {
        const patch = PatchRequest.forScript("this.name = 'test';");

        assert.throws(() => {
            new BatchPatchCommandData(patch, null as any, "companies/1", "Companies/1");
        }, (err: Error) => {
            return err.message.includes("item with the same ID was already added");
        });
    });
});
