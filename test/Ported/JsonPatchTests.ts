import assert from "node:assert";
import {
    IDocumentStore,
    JsonPatchCommandData,
    JsonPatchDocument,
    JsonPatchDocumentOperation
} from "../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../Utils/TestUtil.js";

describe("JsonPatchTests", function () {

    const documentId = "docs/1";

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    async function storeDocument(document: object) {
        const session = store.openSession();
        await session.store(structuredClone(document), documentId);
        await session.saveChanges();
    }

    async function loadDocument(): Promise<Record<string, unknown>> {
        const session = store.openSession();
        const { "@metadata": metadata, id, ...document } = await session.load<any>(documentId);
        return document;
    }

    async function assertPatched(original: object, patch: JsonPatchDocument, expected: object) {
        await storeDocument(original);

        const result = await store.operations.send(new JsonPatchDocumentOperation(documentId, patch));

        assert.strictEqual(result.status, "Patched");
        assert.deepStrictEqual(await loadDocument(), expected);
    }

    async function assertRejected(original: object, patch: JsonPatchDocument, messagePart?: string) {
        await storeDocument(original);

        await assert.rejects(
            () => store.operations.send(new JsonPatchDocumentOperation(documentId, patch)),
            (error: Error) => !messagePart || error.message.includes(messagePart));

        assert.deepStrictEqual(await loadDocument(), original);
    }

    it("patchingWithEscaping", async () => {
        await assertPatched(
            {
                "~": "~",
                "/": "/",
                "foo/bar~": "foo/bar~",
                biscuits: [{ "~": "Nested~" }, { "/": "Nested/" }, { "foo/bar~": "NestedFoo/Bar~" }]
            },
            new JsonPatchDocument()
                .add("/~0", "Hibernating Rhinos1")
                .replace("/~1", "Hibernating Rhinos2")
                .add("/foo~1bar~0", "Hibernating Rhinos3")
                .add("/biscuits/0/~0", "Hibernating Rhinos1")
                .add("/biscuits/1/~1", "Hibernating Rhinos2")
                .replace("/biscuits/1/~1", "Hibernating Rhinos replaced")
                .add("/biscuits/2/foo~1bar~0", "Hibernating Rhinos3"),
            {
                "~": "Hibernating Rhinos1",
                "/": "Hibernating Rhinos2",
                "foo/bar~": "Hibernating Rhinos3",
                biscuits: [
                    { "~": "Hibernating Rhinos1" },
                    { "/": "Hibernating Rhinos replaced" },
                    { "foo/bar~": "Hibernating Rhinos3" }
                ]
            });
    });

    it("patchingWithAdd", async () => {
        await assertPatched(
            { Name: "The Wall" },
            new JsonPatchDocument().add("/Name", "Hibernating Rhinos"),
            { Name: "Hibernating Rhinos" });
    });

    it("patchingWithAddNonExistentDocId", async () => {
        await storeDocument({ Name: "The Wall" });

        await assert.rejects(
            () => store.operations.send(new JsonPatchDocumentOperation(
                documentId + "1", new JsonPatchDocument().add("/Name", "Hibernating Rhinos"))),
            (error: Error) => error.message.includes(
                "Cannot apply json patch because the document docs/11 does not exist"));
    });

    it("patchingWithReplaceNestedPathEscaping", async () => {
        await assertPatched(
            { "/": { Name: "Hibernating" } },
            new JsonPatchDocument().replace("/~1/Name", "Developer"),
            { "/": { Name: "Developer" } });
    });

    it("patchingWithAddNestedPath", async () => {
        await assertPatched(
            { Contact: { Name: "Hibernating" } },
            new JsonPatchDocument().add("/Contact/Title", "Developer"),
            { Contact: { Name: "Hibernating", Title: "Developer" } });
    });

    it("patchingWithAddNestedPathDoesntExist", async () => {
        await assertPatched(
            { Contact: { City: "Hadera", LastName: "Rhinos" } },
            new JsonPatchDocument().add("/Contact/FirstName", "Hibernating"),
            { Contact: { City: "Hadera", LastName: "Rhinos", FirstName: "Hibernating" } });
    });

    it("patchingWithAddMoreThanOneNonexistentProperty", async () => {
        await assertRejected(
            { Contact: { Name: "Rhinos" } },
            new JsonPatchDocument().add("/Contact/FirstName/ExtraProp", "Hiber"),
            "System.ArgumentException: Cannot reach target location. Failed to fetch 'FirstName' "
            + "in path '/Contact/FirstName/ExtraProp' for operation 'Add'");
    });

    it("patchingWithAddToArrayAtTheEnd", async () => {
        await assertPatched(
            { MyArray: [1, 2, 4] },
            new JsonPatchDocument().add("/MyArray/-", 5),
            { MyArray: [1, 2, 4, 5] });
    });

    it("patchingWithAddToArrayAtIndex", async () => {
        await assertPatched(
            { MyArray: [1, 2, 4] },
            new JsonPatchDocument().add("/MyArray/2", 3),
            { MyArray: [1, 2, 3, 4] });
    });

    it("patchingWithAddToNestedArraysAtIndex", async () => {
        await assertPatched(
            { MyArray: [1, 2, [22, 23]] },
            new JsonPatchDocument().add("/MyArray/2/1", 100),
            { MyArray: [1, 2, [22, 100, 23]] });
    });

    it("patchingWithRemove", async () => {
        await assertPatched(
            { Name: "The Wall", City: "Hadera" },
            new JsonPatchDocument().remove("/Name"),
            { City: "Hadera" });
    });

    it("patchingWithRemoveArrayElement", async () => {
        await assertPatched(
            { MyArray: [1, 2, 3] },
            new JsonPatchDocument().remove("/MyArray/1"),
            { MyArray: [1, 3] });
    });

    it("patchingWithReplace", async () => {
        await assertPatched(
            { Name: "The Wall" },
            new JsonPatchDocument().replace("/Name", "Hibernating Rhinos"),
            { Name: "Hibernating Rhinos" });
    });

    it("patchingWithReplaceAtNonExistent", async () => {
        await assertRejected(
            { Name: "The Wall", Address: { City: "Netanya" } },
            new JsonPatchDocument().replace("/Address/NonexistentProperty", "Hibernating Rhinos"),
            "System.ArgumentException: Cannot reach target location. Failed to fetch 'NonexistentProperty' "
            + "in path '/Address/NonexistentProperty' for operation 'Replace'");
    });

    it("patchingWithReplaceArrayElement", async () => {
        await assertPatched(
            { Name: null, MyArray: [1, 2, 4] },
            new JsonPatchDocument().replace("/MyArray/1", 100),
            { Name: null, MyArray: [1, 100, 4] });
    });

    it("patchingWithMove", async () => {
        await assertPatched(
            { Name: "Hibernating", MyArray: null },
            new JsonPatchDocument().move("/Name", "/NewPropName"),
            { MyArray: null, NewPropName: "Hibernating" });
    });

    it("patchingWithMoveToNestedInSameObject", async () => {
        await assertRejected(
            { Name: "Hibernating", MyArray: null },
            new JsonPatchDocument().move("/Name", "/Name/CompanyName"));
    });

    it("patchingWithMoveArrayElementFromIndexToIndex", async () => {
        await assertPatched(
            { MyArray: [20, 40, 10, 30] },
            new JsonPatchDocument()
                .move("/MyArray/0", "/MyArray/2")
                .move("/MyArray/0", "/MyArray/3"),
            { MyArray: [10, 20, 30, 40] });
    });

    it("patchingWithMultipleAddReplace", async () => {
        await assertPatched(
            { Name: "Hibernating" },
            new JsonPatchDocument()
                .add("/Name", { City: "Netanya" })
                .replace("/Name/City", "Hadera"),
            { Name: { City: "Hadera" } });
    });

    it("patchingWithMultipleAddRemoveObjects", async () => {
        await assertPatched(
            { MyArray: null },
            new JsonPatchDocument()
                .add("/Name", { City: "Netanya" })
                .remove("/Name"),
            { MyArray: null });
    });

    it("patchingWithTestAsSingleOperation", async () => {
        await assertRejected(
            { Name: "The Wall" },
            new JsonPatchDocument().test("/Name", "The Wal"),
            "System.InvalidOperationException: The current value 'The Wall' is not equal to the test value 'The Wal'");
    });

    it("patchingWithTestMultipleTests", async () => {
        const values = {
            Float: 13,
            Double: 13,
            Long: 13,
            String: "The Wall",
            Boolean1: false,
            Boolean2: true,
            Contact: { Name: "Stav" }
        };

        const patch = new JsonPatchDocument().test("/List", values);
        for (const [key, value] of Object.entries(values)) {
            patch.test("/" + key, value);
        }

        await storeDocument({ ...values, List: values });

        const result = await store.operations.send(new JsonPatchDocumentOperation(documentId, patch));

        assert.strictEqual(result.status, "NotModified");
        assert.deepStrictEqual(await loadDocument(), { ...values, List: values });
    });

    it("patchingWithTestAsSingleOperationNumericVsString", async () => {
        await assertRejected(
            { Name: "1" },
            new JsonPatchDocument().test("/Name", 1),
            "System.InvalidOperationException: The current value '1' is not equal to the test value '1'");
    });

    it("patchingWithTestMultipleOperations", async () => {
        await assertPatched(
            { Name: "Hibernating", MyArray: [1, 2, 5] },
            new JsonPatchDocument()
                .replace("/MyArray/1", { City: "Netanya" })
                .replace("/MyArray/1/City", "Hadera")
                .test("/MyArray", [1, { City: "Hadera" }, 5]),
            { Name: "Hibernating", MyArray: [1, { City: "Hadera" }, 5] });
    });

    it("patchingWithTestMultipleOperationsFailure", async () => {
        await assertRejected(
            { Name: "Hibernating", MyArray: [1, 2, 5] },
            new JsonPatchDocument()
                .replace("/MyArray/1", { City: "Netanya" })
                .replace("/MyArray/1/City", "Hadera")
                .test("/MyArray", [1, { City: "Netanya" }, 5]),
            "The current value '[1,{\"City\":\"Hadera\"},5]' is not equal to the test value "
            + "'[1,{\"City\":\"Netanya\"},5]");
    });

    it("patchingWithDeferSimpleAdd", async () => {
        await storeDocument({ Name: "Hibernating" });

        const session = store.openSession();
        session.advanced.defer(new JsonPatchCommandData(
            documentId, new JsonPatchDocument().add("/Name", { City: "Netanya" })));
        await session.saveChanges();

        assert.deepStrictEqual(await loadDocument(), { Name: { City: "Netanya" } });
    });

    it("patchingWithDeferInsertToArray", async () => {
        await storeDocument({ Name: "Hibernating", MyArray: [1, 2, 3] });

        const session = store.openSession();
        session.advanced.defer(new JsonPatchCommandData(
            documentId, new JsonPatchDocument().add("/MyArray/2", { City: "Netanya" })));
        await session.saveChanges();

        assert.deepStrictEqual(
            await loadDocument(),
            { Name: "Hibernating", MyArray: [1, 2, { City: "Netanya" }, 3] });
    });

    it("returns the patched document and its change vector", async () => {
        await storeDocument({ Name: "The Wall" });

        const result = await store.operations.send(
            new JsonPatchDocumentOperation(documentId, new JsonPatchDocument().replace("/Name", "Rhinos")));

        assert.strictEqual(result.status, "Patched");
        assert.strictEqual((result.modifiedDocument as any).Name, "Rhinos");
        assert.ok(result.changeVector);
        assert.ok(result.lastModified instanceof Date);
    });

    it("rejects a missing id or patch before sending the request", () => {
        assert.throws(
            () => new JsonPatchDocumentOperation("", new JsonPatchDocument()), { name: "InvalidArgumentException" });
        assert.throws(
            () => new JsonPatchDocumentOperation(documentId, null), { name: "InvalidArgumentException" });
    });
});
