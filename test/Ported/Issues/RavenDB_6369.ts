import { milliseconds } from "date-fns";
import {
    AbstractCsharpIndexCreationTask,
    IDocumentStore,
    IndexQuery,
    InMemoryDocumentSessionOperations,
    StopIndexingOperation
} from "../../../src/index.js";
import { QueryCommand } from "../../../src/Documents/Commands/QueryCommand.js";
import { User } from "../../Assets/Entities.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions.js";

class Users_ByName extends AbstractCsharpIndexCreationTask {
    public constructor() {
        super();

        this.map = "from u in docs.Users select new { u.name }";
    }
}

describe("RavenDB_6369", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("should timeout", async () => {
        const index = new Users_ByName();
        await index.execute(store);

        await store.maintenance.send(new StopIndexingOperation());

        {
            const session = store.openSession();
            await session.store(Object.assign(new User(), { name: "John" }));
            await session.saveChanges();
        }

        const session = store.openSession();
        const query = new IndexQuery(`FROM INDEX '${index.getIndexName()}'`);
        query.waitForNonStaleResultsTimeout = milliseconds({ seconds: 5 });
        query.waitForNonStaleResults = true;

        const command = new QueryCommand(session as unknown as InMemoryDocumentSessionOperations, query, {
            indexEntriesOnly: false,
            metadataOnly: false
        });
        command.timeout = milliseconds({ seconds: 0.1 });

        await assertThrows(() => store.getRequestExecutor().execute(command), err => {
            assertThat(err.name).isEqualTo("RavenException");
            assertThat(err.message).contains("failed with timeout after");
        });
    });
});
