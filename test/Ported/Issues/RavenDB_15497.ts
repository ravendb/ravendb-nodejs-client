import {
    AbstractIndexCreationTask,
    DisableIndexOperation,
    GetIndexStatisticsOperation,
    IDocumentStore
} from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions";
import { User } from "../../Assets/Entities";

describe("RavenDB_15497", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("waitForIndexesAfterSaveChangesCanExitWhenThrowOnTimeoutIsFalse", async () => {
        const index = new Index();
        await index.execute(store);

        await store.maintenance.send(new DisableIndexOperation(index.getIndexName()));

        const indexStats = await store.maintenance.send(new GetIndexStatisticsOperation(index.getIndexName()));

        assertThat(indexStats.state)
            .isEqualTo("Disabled");
        assertThat(indexStats.status)
            .isEqualTo("Disabled");

        {
            const session = store.openSession();
            const user = new User();
            user.name = "user1";

            await session.store(user);

            session.advanced.waitForIndexesAfterSaveChanges({
                throwOnTimeout: false,
                timeout: 3_000
            });

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const user = new User();
            user.name = "user1";

            await session.store(user);

            session.advanced.waitForIndexesAfterSaveChanges({
                timeout: 3_000,
                throwOnTimeout: true
            });

            await assertThrows(() => session.saveChanges(), e => {
                assertThat(e.name)
                    .isEqualTo("TimeoutException");
                assertThat(e.message)
                    .contains("System.TimeoutException");
                assertThat(e.message)
                    .contains("could not verify that 1 indexes has caught up with the changes as of etag");
            });
        }
    });
});


class Index extends AbstractIndexCreationTask {
    constructor() {
        super();

        this.map = "from u in docs.Users select new { u.name }";
    }
}