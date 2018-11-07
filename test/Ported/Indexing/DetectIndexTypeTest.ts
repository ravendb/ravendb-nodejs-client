import * as mocha from "mocha";
import * as BluebirdPromise from "bluebird";
import * as assert from "assert";

import {
    IndexType,
    IndexDefinition,
} from "../../../src";

describe("DetectIndexTypeTest", function () {

    it("testValidMap", async () => {
        const map = "from task in docs.Tasks select new { task.assigneeId }";
        assert.strictEqual(findIndexType(map), "Map");
    });

    it("testMapSpaces", function () {
        const map = "   from task in docs.Tasks select new { task.assigneeId }";
        assert.strictEqual(findIndexType(map), "Map");
    });

    it("testMapTabsBreaks", function () {
        const map = "\r\r\t\r\n  from task in docs.Tasks select new { task.assigneeId }";
        assert.strictEqual(findIndexType(map), "Map" as IndexType);
    });

    it("testMapComments", () => {
        const map = "// this is comment \r\n from task in docs.Tasks select new { task.assigneeId }";
        assert.strictEqual(findIndexType(map), "Map" as IndexType);
    });

    it("testJsMap", () => {
        const map = "map('Users', x => x)";
        assert.strictEqual(findIndexType(map), "JavaScriptMap" as IndexType);
    });

    it("testJsMapComment", () => {
        const map = "//this is test\r\n  map('Users', x => x)";
        assert.strictEqual(findIndexType(map), "JavaScriptMap" as IndexType);
    });

    function findIndexType(map: string): IndexType {
        const indexDefinition = new IndexDefinition();
        indexDefinition.maps = new Set([map]);
        return indexDefinition.type;
    }
});
