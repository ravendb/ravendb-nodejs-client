import assert from "node:assert";
import { describe, it } from "node:test";
import { DocumentsById } from "../../../src/Documents/Session/DocumentsById.js";
import { DocumentInfo } from "../../../src/Documents/Session/DocumentInfo.js";

describe("DocumentsById.getTrackedEntities", function () {

    it("should return a Map where entries are accessible via .get() and .size", function () {
        const docsById = new DocumentsById();

        const doc1 = new DocumentInfo();
        doc1.id = "users/1-A";
        doc1.entity = { name: "Alice" };
        docsById.add(doc1);

        const doc2 = new DocumentInfo();
        doc2.id = "users/2-A";
        doc2.entity = { name: "Bob" };
        docsById.add(doc2);

        // Minimal session mock with isDeleted
        const fakeSession = {
            isDeleted: () => false,
        } as any;

        const tracked = docsById.getTrackedEntities(fakeSession);

        // The result should be a proper Map with accessible entries
        assert.strictEqual(tracked.size, 2,
            "Map.size should be 2 (entries added via Map.set, not bracket notation). Got: " + tracked.size);

        const entry1 = tracked.get("users/1-A");
        assert.ok(entry1, "Should find users/1-A via Map.get()");
        assert.strictEqual(entry1.id, "users/1-A");

        const entry2 = tracked.get("users/2-A");
        assert.ok(entry2, "Should find users/2-A via Map.get()");
        assert.strictEqual(entry2.id, "users/2-A");
    });

    it("should support case-insensitive key lookup", function () {
        const docsById = new DocumentsById();

        const doc = new DocumentInfo();
        doc.id = "Users/1-A";
        doc.entity = { name: "Alice" };
        docsById.add(doc);

        const fakeSession = { isDeleted: () => false } as any;
        const tracked = docsById.getTrackedEntities(fakeSession);

        assert.ok(tracked.get("users/1-a"), "Should find via lowercase key");
        assert.ok(tracked.get("USERS/1-A"), "Should find via uppercase key");
    });
});
