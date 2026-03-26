import assert from "node:assert";
import { describe, it } from "node:test";
import { Highlightings } from "../../../src/Documents/Queries/Highlighting/Hightlightings.js";

describe("Highlightings", function () {

    it("resultIndents should return document keys from the Map", function () {
        const h = new Highlightings("body");

        // Simulate server response with highlighting data
        h.update({
            "body": {
                "users/1-A": ["<b>match</b> in first doc"],
                "users/2-A": ["<b>match</b> in second doc"],
            }
        });

        const indents = h.resultIndents;

        assert.strictEqual(indents.length, 2, "Should have 2 result indents, got " + indents.length);
        assert.ok(indents.includes("users/1-A"), "Should include users/1-A");
        assert.ok(indents.includes("users/2-A"), "Should include users/2-A");
    });

    it("getFragments should still work after fixing resultIndents", function () {
        const h = new Highlightings("body");

        h.update({
            "body": {
                "users/1-A": ["fragment1", "fragment2"],
            }
        });

        const fragments = h.getFragments("users/1-A");
        assert.strictEqual(fragments.length, 2);
        assert.strictEqual(fragments[0], "fragment1");
    });
});
