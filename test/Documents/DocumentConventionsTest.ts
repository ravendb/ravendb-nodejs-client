import assert from "node:assert";
import { describe, it } from "node:test";
import { DocumentConventions } from "../../src/Documents/Conventions/DocumentConventions.js";

describe("DocumentConventions.identityPartsSeparator", function () {

    it("should reject pipe character as separator", function () {
        const conventions = new DocumentConventions();

        assert.throws(() => {
            conventions.identityPartsSeparator = "|";
        }, (err: Error) => {
            return err.message.includes("Cannot set identity parts separator to '|'");
        });
    });

    it("should allow changing separator to a valid value", function () {
        const conventions = new DocumentConventions();
        conventions.identityPartsSeparator = "-";
        assert.strictEqual(conventions.identityPartsSeparator, "-");
    });
});
