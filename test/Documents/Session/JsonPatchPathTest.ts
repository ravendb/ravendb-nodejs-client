import assert from "node:assert";
import {
    canUseJsonPatchValue,
    escapeJsonPointerSegment,
    isValidJsonPointerSegment,
    tryBuildJsonPointer
} from "../../../src/Documents/Session/JsonPatchPath.js";

describe("JsonPatchPath", function () {

    describe("tryBuildJsonPointer", () => {
        const valid: Array<[string, string, boolean]> = [
            ["name", "/name", false],
            ["address.city", "/address/city", false],
            ["tags[1]", "/tags/1", true],
            ["tags[0]", "/tags/0", true],
            ["stuff[0].key", "/stuff/0/key", false],
            ["matrix[1][2]", "/matrix/1/2", true],
            ["$weird_Name1.__x", "/$weird_Name1/__x", false]
        ];

        for (const [path, pointer, endsWithIndex] of valid) {
            it(`converts "${path}" to "${pointer}"`, () => {
                assert.deepStrictEqual(tryBuildJsonPointer(path), { pointer, endsWithIndex });
            });
        }

        const invalid = [
            "", null, undefined, " ", "a b", "tags[i]", "tags[-1]", "tags[01]", "a['b']", "a[\"b\"]",
            "items[items.length-1]", "a..b", ".a", "a.", "a[1", "a]", "1abc", "a-b", "a.b()"
        ];

        for (const path of invalid) {
            it(`rejects ${JSON.stringify(path)}`, () => {
                assert.strictEqual(tryBuildJsonPointer(path as string), null);
            });
        }
    });

    describe("escapeJsonPointerSegment", () => {
        it("escapes ~ and / per RFC 6901", () => {
            assert.strictEqual(escapeJsonPointerSegment("a/b~c"), "a~1b~0c");
            assert.strictEqual(escapeJsonPointerSegment("plain"), "plain");
        });
    });

    describe("isValidJsonPointerSegment", () => {
        it("rejects empty and whitespace-only segments", () => {
            assert.strictEqual(isValidJsonPointerSegment(""), false);
            assert.strictEqual(isValidJsonPointerSegment("   "), false);
            assert.strictEqual(isValidJsonPointerSegment(null), false);
            assert.strictEqual(isValidJsonPointerSegment(undefined), false);
            assert.strictEqual(isValidJsonPointerSegment("lang"), true);
            assert.strictEqual(isValidJsonPointerSegment("a b"), true);
        });
    });

    describe("canUseJsonPatchValue", () => {
        it("accepts null and JSON primitives", () => {
            for (const value of [null, "x", "", 0, 1.5, -3, true, false]) {
                assert.strictEqual(canUseJsonPatchValue(value), true, `expected ${String(value)} to be eligible`);
            }
        });

        it("rejects everything that needs the store's serialization conventions", () => {
            for (const value of [undefined, {}, { a: 1 }, [], [1], new Date(), Number.NaN, Number.POSITIVE_INFINITY, () => 1, Symbol("s"), 10n]) {
                assert.strictEqual(canUseJsonPatchValue(value), false, `expected ${String(value)} to be rejected`);
            }
        });
    });
});
