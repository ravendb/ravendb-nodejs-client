import {
    IDocumentStore,
    IndexQuery,
    InMemoryDocumentSessionOperations,
    PatchCommandData,
    PatchRequest
} from "../../../src/index.js";
import { QueryCommand } from "../../../src/Documents/Commands/QueryCommand.js";
import { User } from "../../Assets/Entities.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

describe("RavenDB_10750", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("should not create property after accessing it", async () => {
        const session = store.openSession();
        await session.store(new User(), "users/1");
        await session.saveChanges();

        session.advanced.defer(new PatchCommandData("users/1", null, PatchRequest.forScript(`
            if (this.NonExistingField != null)
                this.NonExistingField = []; `), null));
        await session.saveChanges();

        const query = new IndexQuery("from users");
        query.waitForNonStaleResults = true;
        const command = new QueryCommand(session as unknown as InMemoryDocumentSessionOperations, query, {
            indexEntriesOnly: false,
            metadataOnly: false
        });
        await store.getRequestExecutor().execute(command);

        assertThat(Object.hasOwn(command.result.results[0], "NonExistingField")).isFalse();
    });
});
