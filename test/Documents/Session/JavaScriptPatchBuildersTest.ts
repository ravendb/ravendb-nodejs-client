import assert from "node:assert";
import { JavaScriptArray } from "../../../src/Documents/Session/JavaScriptArray.js";
import { JavaScriptMap } from "../../../src/Documents/Session/JavaScriptMap.js";

describe("JavaScriptArray / JavaScriptMap operation recording", function () {

    it("JavaScriptArray records push and removeAt in call order and keeps the script", () => {
        const array = new JavaScriptArray<string>(3, "tags");

        array.push("b", "c").removeAt(0).push("d");

        assert.deepStrictEqual(array.operations, [
            { type: "push", values: ["b", "c"] },
            { type: "removeAt", index: 0 },
            { type: "push", values: ["d"] }
        ]);
        assert.strictEqual(array.script,
            "this.tags.push(args.val_0_3,args.val_1_3);\n" +
            "this.tags.splice(args.val_2_3, 1);\n" +
            "this.tags.push(args.val_3_3);");
        assert.deepStrictEqual(array.parameters, { val_0_3: "b", val_1_3: "c", val_2_3: 0, val_3_3: "d" });
    });

    it("JavaScriptArray ignores an empty push and stays chainable", () => {
        const array = new JavaScriptArray<string>(0, "tags");

        assert.strictEqual(array.push(), array);
        assert.deepStrictEqual(array.operations, []);
        assert.strictEqual(array.script, "");
    });

    it("JavaScriptMap records set and remove in call order and keeps the script", () => {
        const map = new JavaScriptMap<string, string>(2, "settings");

        map.set("lang", "en").remove("theme");

        assert.deepStrictEqual(map.operations, [
            { type: "set", key: "lang", value: "en" },
            { type: "remove", key: "theme" }
        ]);
        assert.ok(map.getScript().startsWith(`this.settings["lang"] = args.val_0_2;`));
        assert.ok(map.getScript().endsWith(`delete this.settings["theme"];`));
        assert.deepStrictEqual(map.parameters, { val_0_2: "en" });
    });

    it("JavaScriptMap quotes keys so whitespace, dots and quotes are valid JavaScript", () => {
        const map = new JavaScriptMap<string, string>(0, "settings");

        map.set("a b", "x").set("with.dot", "y").remove(`quo"te`);

        const lines = map.getScript().split(/\r?\n/);
        assert.deepStrictEqual(lines, [
            `this.settings["a b"] = args.val_0_0;`,
            `this.settings["with.dot"] = args.val_1_0;`,
            `delete this.settings["quo\\"te"];`
        ]);
    });
});
