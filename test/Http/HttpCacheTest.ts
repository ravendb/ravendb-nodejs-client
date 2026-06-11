import assert from "node:assert";
import { describe, it } from "node:test";
import { CachedItemMetadata, HttpCache } from "../../src/Http/HttpCache.js";

describe("HttpCache", function () {

    it("caches items until the size budget is exceeded", function () {
        const cache = new HttpCache(10_000);

        for (let i = 0; i < 50; i++) {
            cache.set("http://localhost:8080/url-" + i, "A:1", "x".repeat(80));
        }

        assert.strictEqual(cache.numberOfItems, 50);
    });

    it("evicts least recently used items once the size budget is exceeded", function () {
        const cache = new HttpCache(1_000);

        for (let i = 0; i < 50; i++) {
            cache.set("http://localhost:8080/url-" + i, "A:1", "x".repeat(80));
        }

        assert.strictEqual(cache.numberOfItems, 10);

        let metadata: CachedItemMetadata = null;
        cache.get("http://localhost:8080/url-49", info => metadata = info);
        assert.strictEqual(metadata.changeVector, "A:1");

        cache.get("http://localhost:8080/url-0", info => metadata = info);
        assert.strictEqual(metadata.changeVector, null);
    });

    it("replaces an existing entry without growing the cache", function () {
        const cache = new HttpCache(1_000);

        for (let i = 0; i < 50; i++) {
            cache.set("http://localhost:8080/url", "A:" + i, "x".repeat(80));
        }

        assert.strictEqual(cache.numberOfItems, 1);

        let metadata: CachedItemMetadata = null;
        cache.get("http://localhost:8080/url", info => metadata = info);
        assert.strictEqual(metadata.changeVector, "A:49");
    });

    it("does not evict existing entries to make room for an item exceeding the size budget", function () {
        const cache = new HttpCache(1_000);

        for (let i = 0; i < 5; i++) {
            cache.set("http://localhost:8080/url-" + i, "A:1", "x".repeat(80));
        }

        cache.set("http://localhost:8080/huge", "A:1", "x".repeat(2_000));

        assert.strictEqual(cache.numberOfItems, 5);

        let metadata: CachedItemMetadata = null;
        cache.get("http://localhost:8080/huge", info => metadata = info);
        assert.strictEqual(metadata.changeVector, null);
    });

    it("removes the previous entry when it is replaced by an item exceeding the size budget", function () {
        const cache = new HttpCache(1_000);

        cache.set("http://localhost:8080/url", "A:1", "x".repeat(80));
        cache.set("http://localhost:8080/url", "A:2", "x".repeat(2_000));

        assert.strictEqual(cache.numberOfItems, 0);
    });

    it("does not cache anything when the size is set to zero", function () {
        const cache = new HttpCache(0);

        cache.set("http://localhost:8080/url", "A:1", "result");

        assert.strictEqual(cache.numberOfItems, 0);
    });
});
