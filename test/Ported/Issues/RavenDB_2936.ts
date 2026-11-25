import {
    BulkOperationResult,
    DeleteByQueryOperation,
    IDocumentStore,
    IndexDefinition,
    IndexQuery,
    PatchByQueryOperation,
    PutIndexesOperation,
    QueryOperationOptions
} from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";
import { User } from "../../Assets/Entities.js";

describe("RavenDB_2936", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();

        const indexDefinition = new IndexDefinition();
        indexDefinition.name = "Users/ByName";
        indexDefinition.maps = new Set(["from user in docs.Users select new { user.name }"]);
        await store.maintenance.send(new PutIndexesOperation(indexDefinition));

        const session = store.openSession();
        for (const name of ["Arek", "Oren", "Ayende"]) {
            await session.store(Object.assign(new User(), { name }));
        }
        await session.saveChanges();

        await testContext.waitForIndexing(store);
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("shouldNotRetrieveOperationDetails", async () => {
        let operation = await store.operations.send(new PatchByQueryOperation(
            "FROM INDEX 'Users/ByName' UPDATE { this.lastName = 'Smith' }"));
        let result = await operation.waitForCompletion<BulkOperationResult>(15_000);

        assertThat(result.details).hasSize(0);

        await testContext.waitForIndexing(store);

        operation = await store.operations.send(new DeleteByQueryOperation(new IndexQuery("FROM INDEX 'Users/ByName'")));
        result = await operation.waitForCompletion<BulkOperationResult>(15_000);

        assertThat(result.details).hasSize(0);
    });

    it("shouldRetrieveOperationDetailsWhenTheyWereRequested", async () => {
        const options = { retrieveDetails: true } as QueryOperationOptions;

        let operation = await store.operations.send(new PatchByQueryOperation(
            new IndexQuery("FROM INDEX 'Users/ByName' UPDATE { this.lastName = 'Smith' }"), options));
        let result = await operation.waitForCompletion<BulkOperationResult>(15_000);

        assertThat(result.details).isNotEmpty();
        assertThat(result.details[0]["id"]).isNotNull();
        assertThat(result.details[0]["status"]).isEqualTo("Patched");

        await testContext.waitForIndexing(store);

        operation = await store.operations.send(new DeleteByQueryOperation(new IndexQuery("FROM INDEX 'Users/ByName'"), options));
        result = await operation.waitForCompletion<BulkOperationResult>(30_000);

        assertThat(result.details).isNotEmpty();
        assertThat(result.details[0]["id"]).isNotNull();
    });
});
