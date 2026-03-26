import assert from "node:assert";
import { describe, it } from "node:test";
import { CaseInsensitiveKeysMap } from "../../src/Primitives/CaseInsensitiveKeysMap.js";

describe("CaseInsensitiveKeysMap", function () {

    it("Map.get() is case-insensitive", function () {
        const map = CaseInsensitiveKeysMap.create<number>();
        map.set("Users/1-A", 42);

        assert.strictEqual(map.get("Users/1-A"), 42);
        assert.strictEqual(map.get("users/1-a"), 42);
        assert.strictEqual(map.get("USERS/1-A"), 42);
    });

    it("bracket notation reads go through case-insensitive lookup", function () {
        const map = CaseInsensitiveKeysMap.create<number>();
        map.set("Users/1-A", 42);

        assert.strictEqual(map["Users/1-A"], 42);
        assert.strictEqual(map["users/1-a"], 42);
        assert.strictEqual(map["USERS/1-A"], 42);
    });

    it("bracket notation writes go through Map.set()", function () {
        const map = CaseInsensitiveKeysMap.create<number>();
        map["Users/1-A"] = 42;

        assert.strictEqual(map.size, 1, "size should be 1");
        assert.strictEqual(map.get("users/1-a"), 42);
        assert.strictEqual(map["USERS/1-A"], 42);
    });

    it("Map.has() is case-insensitive", function () {
        const map = CaseInsensitiveKeysMap.create<string>();
        map.set("Key", "value");

        assert.ok(map.has("Key"));
        assert.ok(map.has("key"));
        assert.ok(map.has("KEY"));
        assert.ok(!map.has("other"));
    });

    it("Map.delete() is case-insensitive", function () {
        const map = CaseInsensitiveKeysMap.create<string>();
        map.set("Key", "value");
        assert.strictEqual(map.size, 1);

        map.delete("KEY");
        assert.strictEqual(map.size, 0);
        assert.strictEqual(map.get("key"), undefined);
    });

    it("entries() preserves original key casing", function () {
        const map = CaseInsensitiveKeysMap.create<number>();
        map.set("Users/1-A", 1);
        map.set("Companies/2-B", 2);

        const entries = Array.from(map.entries());
        assert.strictEqual(entries.length, 2);
        assert.strictEqual(entries[0][0], "Users/1-A");
        assert.strictEqual(entries[1][0], "Companies/2-B");
    });

    it("for..of preserves original key casing", function () {
        const map = CaseInsensitiveKeysMap.create<number>();
        map.set("Users/1-A", 1);

        for (const [key, value] of map) {
            assert.strictEqual(key, "Users/1-A");
            assert.strictEqual(value, 1);
        }
    });

    it("last write wins for same key different casing", function () {
        const map = CaseInsensitiveKeysMap.create<number>();
        map.set("Key", 1);
        map.set("KEY", 2);

        assert.strictEqual(map.size, 1);
        assert.strictEqual(map.get("key"), 2);
    });

    it("size reflects actual entries", function () {
        const map = CaseInsensitiveKeysMap.create<number>();
        map.set("a", 1);
        map.set("A", 2);
        map.set("b", 3);

        assert.strictEqual(map.size, 2);
    });

    it("Map methods still accessible on proxy", function () {
        const map = CaseInsensitiveKeysMap.create<number>();
        map.set("key", 1);

        assert.strictEqual(typeof map.get, "function");
        assert.strictEqual(typeof map.set, "function");
        assert.strictEqual(typeof map.has, "function");
        assert.strictEqual(typeof map.delete, "function");
        assert.strictEqual(typeof map.entries, "function");
        assert.strictEqual(typeof map.clear, "function");
    });
});
