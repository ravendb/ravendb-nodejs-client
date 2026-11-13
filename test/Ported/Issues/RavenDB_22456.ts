import assert from "node:assert";
import {
    ConfigureRevisionsOperation,
    CONSTANTS,
    IDocumentStore,
    RevertRevisionsByIdOperation,
    RevisionsCollectionConfiguration,
    RevisionsConfiguration
} from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";

class User {
    public id: string;
    public name: string;
}

describe("RavenDB_22456", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    async function storeUsersWithTenChanges(users: User[]) {
        const defaultConfiguration = new RevisionsCollectionConfiguration();
        defaultConfiguration.disabled = false;

        const configuration = new RevisionsConfiguration();
        configuration.defaultConfig = defaultConfiguration;

        await store.maintenance.send(new ConfigureRevisionsOperation(configuration));

        {
            const session = store.openSession();
            for (const user of users) {
                await session.store(user, user.id);
            }
            await session.saveChanges();
        }

        for (let i = 0; i < 10; i++) {
            const session = store.openSession();
            for (const user of users) {
                const loaded = await session.load<User>(user.id);
                loaded.name = `${user.name}_${i}`;
            }
            await session.saveChanges();
        }
    }

    async function getSixthRevisionChangeVector(id: string): Promise<string> {
        const session = store.openSession();
        assert.strictEqual(await session.advanced.revisions.getCountFor(id), 11);

        const metadata = await session.advanced.revisions.getMetadataFor(id);
        return metadata[5][CONSTANTS.Documents.Metadata.CHANGE_VECTOR];
    }

    async function assertNameAndRevisionsCount(id: string, name: string, revisionsCount: number) {
        const session = store.openSession();
        const user = await session.load<User>(id);
        assert.strictEqual(user.name, name);
        assert.strictEqual(await session.advanced.revisions.getCountFor(id), revisionsCount);
    }

    it("revertByDocumentEP", async () => {
        const user1 = Object.assign(new User(), { id: "Users/1-A", name: "Shahar1" });
        const user2 = Object.assign(new User(), { id: "Users/2-B", name: "Shahar2" });

        await storeUsersWithTenChanges([user1, user2]);

        const user1RevertChangeVector = await getSixthRevisionChangeVector(user1.id);

        await store.operations.send(new RevertRevisionsByIdOperation(user1.id, user1RevertChangeVector));

        await assertNameAndRevisionsCount(user1.id, "Shahar1_4", 12);
        await assertNameAndRevisionsCount(user2.id, "Shahar2_9", 11);
    });

    it("revertByDocumentEpMultipleDocs", async () => {
        const user1 = Object.assign(new User(), { id: "Users/1-A", name: "Shahar1" });
        const user2 = Object.assign(new User(), { id: "Users/2-B", name: "Shahar2" });
        const company1 = Object.assign(new User(), { id: "Companies/1-A", name: "RavenDB1" });
        const company2 = Object.assign(new User(), { id: "Companies/2-B", name: "RavenDB2" });

        await storeUsersWithTenChanges([user1, user2, company1, company2]);

        const user1RevertChangeVector = await getSixthRevisionChangeVector(user1.id);
        const company1RevertChangeVector = await getSixthRevisionChangeVector(company1.id);

        await store.operations.send(new RevertRevisionsByIdOperation({
            [user1.id]: user1RevertChangeVector,
            [company1.id]: company1RevertChangeVector
        }));

        await assertNameAndRevisionsCount(user1.id, "Shahar1_4", 12);
        await assertNameAndRevisionsCount(company1.id, "RavenDB1_4", 12);
        await assertNameAndRevisionsCount(user2.id, "Shahar2_9", 11);
        await assertNameAndRevisionsCount(company2.id, "RavenDB2_9", 11);
    });

    it("revertByDocumentEpFail", async () => {
        const user1 = Object.assign(new User(), { id: "Users/1-A", name: "Shahar1" });
        const user2 = Object.assign(new User(), { id: "Users/2-B", name: "Shahar2" });

        await storeUsersWithTenChanges([user1, user2]);

        const user2RevertChangeVector = await getSixthRevisionChangeVector(user2.id);
        const missingChangeVector = "A:253-jyJQ+3eQ5kuHIGZ+aqSVow";

        await assert.rejects(
            () => store.operations.send(new RevertRevisionsByIdOperation(user1.id, missingChangeVector)),
            (error: Error) => error.message.includes(
                `Revision with the cv "${missingChangeVector}" doesn't exist (id: 'Users/1-A')`));

        await assert.rejects(
            () => store.operations.send(new RevertRevisionsByIdOperation(user1.id, user2RevertChangeVector)),
            (error: Error) => error.message.includes(
                `Revision with the cv "${user2RevertChangeVector}" doesn't belong to the doc "Users/1-A" but to the doc "Users/2-B"`));

        const session = store.openSession();
        assert.strictEqual(await session.advanced.revisions.getCountFor(user1.id), 11);
    });

    it("rejects invalid parameters before sending the request", () => {
        assert.throws(() => new RevertRevisionsByIdOperation(null), { name: "InvalidArgumentException" });
        assert.throws(() => new RevertRevisionsByIdOperation({}), { name: "InvalidArgumentException" });
        assert.throws(() => new RevertRevisionsByIdOperation("", "A:1"), { name: "InvalidArgumentException" });
        assert.throws(() => new RevertRevisionsByIdOperation("users/1", ""), { name: "InvalidArgumentException" });
    });
});
