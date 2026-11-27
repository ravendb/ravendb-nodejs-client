import { milliseconds } from "date-fns";
import {
    AbstractCsharpIndexCreationTask,
    DisableIndexOperation,
    GetIndexStatisticsOperation,
    IDocumentStore
} from "../../../src/index.js";
import { User } from "../../Assets/Entities.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions.js";

class Index extends AbstractCsharpIndexCreationTask {
    public constructor() {
        super();
        this.map = "from user in docs.Users select new { user.name }";
    }
}

class ErroredIndex extends AbstractCsharpIndexCreationTask {
    public constructor() {
        super();
        this.map = "from user in docs.Users select new { Count = 3 / user.count }";
    }
}

function assertTimeoutError(err: Error, expectedMessagePart: string) {
    assertThat(err.name)
        .isEqualTo("RavenTimeoutException");
    assertThat(err.message)
        .startsWith("Raven.Client.Exceptions.RavenTimeoutException");
    assertThat(err.message)
        .contains(expectedMessagePart);
    assertThat(err.message.includes("total paused indexes"))
        .isFalse();
}

describe("RavenDB_18688", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("doesnt throw when index is disabled", async () => {
        const index = new Index();
        await index.execute(store);
        await store.maintenance.send(new DisableIndexOperation(index.getIndexName()));

        {
            const session = store.openSession();
            await session.store(Object.assign(new User(), { name: "Grisha" }));
            session.advanced.waitForIndexesAfterSaveChanges({ timeout: milliseconds({ seconds: 5 }) });
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            await session.store(Object.assign(new User(), { name: "Grisha" }));
            session.advanced.waitForIndexesAfterSaveChanges({
                timeout: milliseconds({ seconds: 5 }),
                indexes: [index.getIndexName()]
            });
            await assertThrows(() => session.saveChanges(), err => {
                assertTimeoutError(err, "Total relevant indexes: 1, total stale indexes: 1");
                assertThat(err.message)
                    .contains("could not verify that all indexes has caught up with the changes as of etag");
            });
        }
    });

    it("doesnt throw when index is errored", async function () {
        this.timeout(milliseconds({ minutes: 1 }));

        const index = new ErroredIndex();
        await index.execute(store);

        {
            const session = store.openSession();
            await session.store(Object.assign(new User(), { count: 0 }));
            await session.saveChanges();
        }

        const state = await testContext.waitForValue(async () => {
            const indexStats = await store.maintenance.send(new GetIndexStatisticsOperation(index.getIndexName()));
            return indexStats.state;
        }, "Error");

        assertThat(state)
            .isEqualTo("Error");

        const indexName = index.getIndexName();

        {
            const session = store.openSession();
            await session.store(Object.assign(new User(), { count: 0 }));
            session.advanced.waitForIndexesAfterSaveChanges({ timeout: milliseconds({ seconds: 5 }) });
            await assertThrows(() => session.saveChanges(), err => {
                assertTimeoutError(err,
                    `Total relevant indexes: 1, total stale indexes: 1 (${indexName}), total errored indexes: 1 (${indexName})`);
            });
        }

        {
            const session = store.openSession();
            await session.store(Object.assign(new User(), { count: 0 }));
            session.advanced.waitForIndexesAfterSaveChanges({
                timeout: milliseconds({ seconds: 5 }),
                indexes: [indexName]
            });
            await assertThrows(() => session.saveChanges(), err => {
                assertTimeoutError(err,
                    `Total relevant indexes: 1, total stale indexes: 1 (${indexName}), total errored indexes: 1 (${indexName})`);
            });
        }

        await new Index().execute(store);

        {
            const session = store.openSession();
            await session.store(Object.assign(new User(), { count: 0 }));
            session.advanced.waitForIndexesAfterSaveChanges({ timeout: milliseconds({ seconds: 5 }) });
            await assertThrows(() => session.saveChanges(), err => {
                assertTimeoutError(err,
                    `Total relevant indexes: 2, total stale indexes: 1 (${indexName}), total errored indexes: 1 (${indexName})`);
            });
        }
    });
});
