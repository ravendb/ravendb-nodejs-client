import { ObjectUtil } from "../../src/index.js";
import assert from "node:assert";

describe("ObjectUtil casing functions", function () {

    describe("camelCase", function () {
        it("should lowercase first character without locale", function () {
            assert.strictEqual(ObjectUtil.camelCase("Name"), "name");
            assert.strictEqual(ObjectUtil.camelCase("FirstName"), "firstName");
        });

        it("should lowercase first character with locale", function () {
            assert.strictEqual(ObjectUtil.camelCase("Name", "en"), "name");
            assert.strictEqual(ObjectUtil.camelCase("FirstName", "en"), "firstName");
        });
    });

    describe("pascalCase", function () {
        it("should uppercase first character without locale", function () {
            assert.strictEqual(ObjectUtil.pascalCase("name"), "Name");
            assert.strictEqual(ObjectUtil.pascalCase("firstName"), "FirstName");
        });

        it("should uppercase first character with locale", function () {
            assert.strictEqual(ObjectUtil.pascalCase("name", "en"), "Name");
            assert.strictEqual(ObjectUtil.pascalCase("firstName", "en"), "FirstName");
        });
    });
});
