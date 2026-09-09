import assert from "node:assert";
import { DocumentConventions, JsonPatchCommandData, JsonPatchDocument } from "../../../src/index.js";

describe("JsonPatchCommandData", function () {

    it("serializes to the batch wire format", () => {
        const patch = new JsonPatchDocument()
            .add("/name", "Updated")
            .replace("/tags/1", "B")
            .remove("/settings/lang")
            .add("/tags/-", null)
            .move("/a", "/b")
            .copy("/c", "/d")
            .test("/age", 25);

        const command = new JsonPatchCommandData("users/1", patch);

        assert.deepStrictEqual(command.serialize(new DocumentConventions()), {
            Id: "users/1",
            ChangeVector: null,
            JsonPatch: {
                Operations: [
                    { op: "add", path: "/name", value: "Updated" },
                    { op: "replace", path: "/tags/1", value: "B" },
                    { op: "remove", path: "/settings/lang" },
                    { op: "add", path: "/tags/-", value: null },
                    { op: "move", from: "/a", path: "/b" },
                    { op: "copy", from: "/c", path: "/d" },
                    { op: "test", path: "/age", value: 25 }
                ]
            },
            ReturnDocument: false,
            Type: "JsonPatch"
        });
    });

    it("serializes object values as plain object literals", () => {
        class Address {
            public city: string;
            public country: string;
        }

        const command = new JsonPatchCommandData("users/1",
            new JsonPatchDocument().add("/address", Object.assign(new Address(), { city: "Hadera", country: "IL" })));

        const serialized = command.serialize(new DocumentConventions()) as any;
        assert.deepStrictEqual(serialized.JsonPatch.Operations[0].value, { city: "Hadera", country: "IL" });
    });

    it("sends null for an undefined add/replace value", () => {
        const command = new JsonPatchCommandData("users/1", new JsonPatchDocument().add("/name", undefined));

        const serialized = command.serialize(new DocumentConventions()) as any;
        assert.strictEqual(serialized.JsonPatch.Operations[0].value, null);
    });

    it("validates its arguments", () => {
        assert.throws(() => new JsonPatchCommandData(null, new JsonPatchDocument()), /Id cannot be null/);
        assert.throws(() => new JsonPatchCommandData("users/1", null), /JsonPatch cannot be null/);
    });

    it("returns the document only when the session tracks it", () => {
        const command = new JsonPatchCommandData("users/1", new JsonPatchDocument().add("/name", "x"));

        command.onBeforeSaveChanges({ isLoaded: (id: string) => id === "users/1" } as any);
        assert.strictEqual(command.returnDocument, true);

        command.onBeforeSaveChanges({ isLoaded: () => false } as any);
        assert.strictEqual(command.returnDocument, false);
    });
});
