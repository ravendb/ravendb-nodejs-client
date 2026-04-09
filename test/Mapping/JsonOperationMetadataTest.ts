import assert from "node:assert";
import { JsonOperation } from "../../src/Mapping/JsonOperation.js";
import { DocumentInfo } from "../../src/Documents/Session/DocumentInfo.js";

describe("JsonOperation metadata field handling", function () {

    it("should not report removed metadata fields as changes", function () {
        // Original document from server has metadata fields
        const original = {
            "name": "John",
            "@last-modified": "2024-01-01T00:00:00.0000000Z",
            "@change-vector": "A:1-abc",
            "@id": "users/1",
            "@collection": "Users"
        };

        // New document after entity serialization — metadata fields stripped
        const updated = {
            "name": "John"
        };

        const docInfo = new DocumentInfo();
        docInfo.id = "users/1";
        docInfo.document = original;
        docInfo.newDocument = false;

        const changes: Record<string, any[]> = {};
        const hasChanged = JsonOperation.entityChanged(updated, docInfo, changes);

        assert.strictEqual(hasChanged, false,
            "Should not detect changes when only metadata fields are removed");
        assert.deepStrictEqual(changes, {},
            "Changes map should be empty when only metadata fields differ");
    });

    it("should still report real field changes alongside metadata removal", function () {
        const original = {
            "name": "John",
            "@last-modified": "2024-01-01T00:00:00.0000000Z",
            "@change-vector": "A:1-abc"
        };

        const updated = {
            "name": "Jane"
        };

        const docInfo = new DocumentInfo();
        docInfo.id = "users/1";
        docInfo.document = original;
        docInfo.newDocument = false;

        const changes: Record<string, any[]> = {};
        const hasChanged = JsonOperation.entityChanged(updated, docInfo, changes);

        assert.strictEqual(hasChanged, true,
            "Should detect changes when real fields differ");
        // Verify only real field change is reported, not metadata removal
        const fieldChanges = changes["users/1"];
        assert.ok(fieldChanges, "Should have changes for users/1");
        const fieldNames = fieldChanges.map(c => c.fieldName);
        assert.ok(!fieldNames.includes("@last-modified"),
            "Should not report @last-modified as a change");
        assert.ok(!fieldNames.includes("@change-vector"),
            "Should not report @change-vector as a change");
    });
});
