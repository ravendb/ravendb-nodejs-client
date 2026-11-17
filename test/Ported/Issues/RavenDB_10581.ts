import { DatabaseSmugglerExportOptions, IDocumentStore, PutDocumentCommand } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

describe("RavenDB_10581", function () {

    let store1: IDocumentStore;
    let store2: IDocumentStore;

    beforeEach(async function () {
        store1 = await testContext.getDocumentStore();
        store2 = await testContext.getDocumentStore();
    });

    afterEach(async () => {
        await disposeTestDocumentStore(store1);
        await disposeTestDocumentStore(store2);
    });

    async function put(store: IDocumentStore, id: string, name: string) {
        const command = new PutDocumentCommand(id, null, { name, "@metadata": { "@collection": "Users" } });
        await store.getRequestExecutor().execute(command);
        return command.result;
    }

    it("shouldWork", async () => {
        const result = await put(store1, "users/", "John");
        await put(store1, result.id, "Doe");
        await put(store1, "users/", "Bob");

        const operation = await store1.smuggler.export(new DatabaseSmugglerExportOptions(), store2.smuggler);
        await operation.waitForCompletion(30_000);

        // the server-side identity of the target must have moved past the imported ids
        const afterImport = await put(store2, "users/", "Bob");
        assertThat(afterImport.id).isNotNull();
    });
});
