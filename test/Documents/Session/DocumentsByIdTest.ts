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

        const fakeSession = {
            isDeleted: () => false,
        } as any;

        const tracked = docsById.getTrackedEntities(fakeSession);

        assert.strictEqual(tracked.size, 2,
            "Map.size should be 2. Got: " + tracked.size);

        const entry1 = tracked.get("users/1-A");
        assert.ok(entry1, "Should find users/1-A via Map.get()");
        assert.strictEqual(entry1.id, "users/1-A");

        const entry2 = tracked.get("users/2-A");
        assert.ok(entry2, "Should find users/2-A via Map.get()");
        assert.strictEqual(entry2.id, "users/2-A");

        // Bracket notation should also work via the Proxy
        assert.ok(tracked["users/1-A"], "Should find users/1-A via bracket notation");
        assert.ok(tracked["users/2-A"], "Should find users/2-A via bracket notation");
    });

    it("should support case-insensitive key lookup via both Map.get() and bracket notation", function () {
        const docsById = new DocumentsById();

        const doc = new DocumentInfo();
        doc.id = "Users/1-A";
        doc.entity = { name: "Alice" };
        docsById.add(doc);

        const fakeSession = { isDeleted: () => false } as any;
        const tracked = docsById.getTrackedEntities(fakeSession);

        assert.ok(tracked.get("users/1-a"), "Map.get() lowercase");
        assert.ok(tracked.get("USERS/1-A"), "Map.get() uppercase");
        assert.ok(tracked["users/1-a"], "bracket notation lowercase");
        assert.ok(tracked["USERS/1-A"], "bracket notation uppercase");
    });
});
