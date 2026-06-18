import assert from "node:assert";
import { describe, it } from "node:test";
import { assertThrows } from "../Utils/AssertExtensions.js";
import { normalizePaths } from "../../src/Documents/Operations/Replication/PullReplicationPathFilterUtils.js";

describe("RavenDB_16961", () => {
    describe("normalizePaths", () => {
        it("should return undefined when all entries are empty after trim", () => {
            assert.strictEqual(normalizePaths(["", "  ", "\t"]), undefined);
        });

        it("should return undefined for empty array", () => {
            assert.strictEqual(normalizePaths([]), undefined);
        });

        it("should trim whitespace from paths", () => {
            const result = normalizePaths(["  users/profile  ", " orders/details "]);
            assert.deepStrictEqual(result, ["users/profile", "orders/details"]);
        });

        it("should drop empty and whitespace-only entries", () => {
            const result = normalizePaths(["users/profile", "", "  ", "orders/details"]);
            assert.deepStrictEqual(result, ["users/profile", "orders/details"]);
        });

        it("should accept valid wildcard 'users/*'", () => {
            assert.deepStrictEqual(normalizePaths(["users/*"]), ["users/*"]);
        });

        it("should accept valid wildcard 'docs/-*'", () => {
            assert.deepStrictEqual(normalizePaths(["docs/-*"]), ["docs/-*"]);
        });

        it("should accept bare '*'", () => {
            assert.deepStrictEqual(normalizePaths(["*"]), ["*"]);
        });

        it("should throw InvalidOperationException for 'users*' (no slash or dash before *)", async () => {
            await assertThrows(
                () => normalizePaths(["users*"]),
                err => assert.ok(err.message.includes("users*"),
                    `Expected message to include the bad path, got: ${err.message}`)
            );
        });

        it("should throw for 'foo/bar*' (letter before *)", async () => {
            await assertThrows(
                () => normalizePaths(["foo/bar*"]),
                err => assert.ok(err.message.includes("foo/bar*"),
                    `Expected message to include the bad path, got: ${err.message}`)
            );
        });
    });
});
