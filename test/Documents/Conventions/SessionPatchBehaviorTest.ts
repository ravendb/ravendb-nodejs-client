import assert from "node:assert";
import { DocumentConventions } from "../../../src/index.js";

describe("DocumentConventions.sessionPatchBehavior", function () {

    it("defaults to JsonPatch", () => {
        assert.strictEqual(new DocumentConventions().sessionPatchBehavior, "JsonPatch");
    });

    it("can be switched to JavaScript before the conventions are frozen", () => {
        const conventions = new DocumentConventions();
        conventions.sessionPatchBehavior = "JavaScript";
        assert.strictEqual(conventions.sessionPatchBehavior, "JavaScript");
    });

    it("cannot be changed after the conventions are frozen", () => {
        const conventions = new DocumentConventions();
        conventions.freeze();
        assert.throws(() => {
            conventions.sessionPatchBehavior = "JavaScript";
        });
    });
});
