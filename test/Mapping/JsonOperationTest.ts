import assert from "node:assert";
import { describe, it } from "node:test";
import { JsonOperation } from "../../src/Mapping/JsonOperation.js";

describe("JsonOperation", function () {

    it("scalar to array change should only report FieldChanged", function () {
        const oldDoc = { name: "test", tags: "single-value" };
        const newDoc = { name: "test", tags: ["value1", "value2"] };

        const docChanges: any[] = [];
        (JsonOperation as any)._compareJson("", "test-id", oldDoc, newDoc, {}, docChanges);

        const fieldChanged = docChanges.filter(c => c.change === "FieldChanged");
        const arrayChanges = docChanges.filter(c =>
            c.change === "ArrayValueAdded" || c.change === "ArrayValueChanged" || c.change === "ArrayValueRemoved");

        assert.strictEqual(fieldChanged.length, 1,
            "Should have exactly 1 FieldChanged for 'tags'");
        assert.strictEqual(fieldChanged[0].fieldName, "tags");
        assert.strictEqual(arrayChanges.length, 0,
            "Should not have spurious array change entries from fallthrough");
    });
});
