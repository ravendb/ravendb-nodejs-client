import assert from "node:assert";
import { isDeepStrictEqual } from "node:util";
import {
    ConfigureRevisionsBinCleanerOperation,
    ConfigureRevisionsOperation,
    GetDatabaseRecordOperation,
    IDocumentStore,
    RevisionsBinConfiguration,
    RevisionsCollectionConfiguration,
    RevisionsConfiguration
} from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { User } from "../../Assets/Entities.js";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions.js";

describe("RavenDB_21326", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    async function configureRevisionsBinCleaner(
        configuration: RevisionsBinConfiguration,
        expectedInRecord: RevisionsBinConfiguration = configuration) {
        const result = await store.maintenance.send(new ConfigureRevisionsBinCleanerOperation(configuration));
        assertThat(result.raftCommandIndex).isGreaterThan(0);

        const revisionsBin = await testContext.waitForValue(
            async () => (await store.maintenance.server.send(new GetDatabaseRecordOperation(store.database))).revisionsBin,
            expectedInRecord,
            { equal: isDeepStrictEqual });
        assert.deepStrictEqual(revisionsBin, expectedInRecord);
    }

    it("revisionsBinCleanerTest", async () => {
        const revisionsConfiguration = new RevisionsConfiguration();
        const usersConfiguration = new RevisionsCollectionConfiguration();
        usersConfiguration.disabled = false;
        revisionsConfiguration.collections = new Map([["Users", usersConfiguration]]);
        await store.maintenance.send(new ConfigureRevisionsOperation(revisionsConfiguration));

        const user1 = Object.assign(new User(), { id: "Users/1-A", name: "Shahar" });
        const user2 = Object.assign(new User(), { id: "Users/2-B", name: "Shahar" });
        {
            const session = store.openSession();
            await session.store(user1);
            await session.store(user2);
            await session.saveChanges();

            for (let i = 1; i <= 10; i++) {
                (await session.load<User>(user1.id)).name = "Shahar" + i;
                (await session.load<User>(user2.id)).name = "Shahar" + i;
                await session.saveChanges();
            }

            session.delete(user1.id);
            session.delete(user2.id);
            await session.saveChanges();

            await session.store(user2);
            await session.saveChanges();

            assertThat(await session.advanced.revisions.getCountFor(user1.id)).isEqualTo(12);
            assertThat(await session.advanced.revisions.getCountFor(user2.id)).isEqualTo(13);
        }

        const configuration: RevisionsBinConfiguration = {
            disabled: false,
            minimumEntriesAgeToKeepInMin: 0,
            cleanerFrequencyInSec: 1
        };
        await configureRevisionsBinCleaner(configuration);

        const user1Revisions = await testContext.waitForValue(
            () => store.openSession().advanced.revisions.getCountFor(user1.id), 0);
        assertThat(user1Revisions).isEqualTo(0);

        configuration.disabled = true;
        await configureRevisionsBinCleaner(configuration);

        {
            const session = store.openSession();
            session.delete(user2.id);
            await session.saveChanges();
        }

        assertThat(await store.openSession().advanced.revisions.getCountFor(user2.id)).isEqualTo(14);
    });

    it("omittedFieldsKeepServerDefaults", async () => {
        await configureRevisionsBinCleaner({ disabled: true }, {
            disabled: true,
            minimumEntriesAgeToKeepInMin: 30 * 24 * 60,
            cleanerFrequencyInSec: 5 * 60
        });
    });

    it("throwsOnNullConfiguration", async () => {
        await assertThrows(() => new ConfigureRevisionsBinCleanerOperation(null),
            err => assertThat(err.name).isEqualTo("InvalidArgumentException"));
    });
});
