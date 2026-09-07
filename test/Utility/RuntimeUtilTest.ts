import { RuntimeUtil } from "../../src/Utility/RuntimeUtil.js";
import assert from "node:assert";

describe("RuntimeUtil", function () {

    afterEach(() => {
        delete (globalThis as { Deno?: unknown }).Deno;
    });

    describe("isDeno", function () {
        it("is false when the Deno global is absent", function () {
            assert.strictEqual(RuntimeUtil.isDeno(), false);
        });

        it("detects the Deno global", function () {
            (globalThis as { Deno?: unknown }).Deno = { version: { deno: "2.9.5" } };
            assert.strictEqual(RuntimeUtil.isDeno(), true);
        });

        it("ignores a Deno global without a version marker", function () {
            (globalThis as { Deno?: unknown }).Deno = {};
            assert.strictEqual(RuntimeUtil.isDeno(), false);
        });
    });

    describe("supportsUndiciDispatcher", function () {
        it("is true on Node", function () {
            assert.strictEqual(RuntimeUtil.supportsUndiciDispatcher(), true);
        });

        it("is false on Deno - its fetch silently ignores an undici dispatcher", function () {
            (globalThis as { Deno?: unknown }).Deno = { version: { deno: "2.9.5" } };
            assert.strictEqual(RuntimeUtil.supportsUndiciDispatcher(), false);
        });
    });
});
