import assert from "node:assert";
import {
    ConfigureRevisionsOperation,
    CONSTANTS,
    DeleteRevisionsOperation,
    IDocumentSession,
    IDocumentStore,
    RevisionsCollectionConfiguration,
    RevisionsConfiguration
} from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";

class User {
    public id: string;
    public name: string;
}

class Company {
    public id: string;
    public name: string;
}

describe("RavenDB_17494", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    async function setupRevisions(maximumRevisionsToDeleteUponDocumentUpdate?: number) {
        const defaultConfiguration = new RevisionsCollectionConfiguration();
        defaultConfiguration.disabled = false;
        defaultConfiguration.maximumRevisionsToDeleteUponDocumentUpdate = maximumRevisionsToDeleteUponDocumentUpdate;

        const configuration = new RevisionsConfiguration();
        configuration.defaultConfig = defaultConfiguration;

        await store.maintenance.send(new ConfigureRevisionsOperation(configuration));
    }

    async function getRevisionsChangeVectors(session: IDocumentSession, id: string): Promise<string[]> {
        const metadata = await session.advanced.revisions.getMetadataFor(id);
        return metadata.map(x => x[CONSTANTS.Documents.Metadata.CHANGE_VECTOR]);
    }

    async function storeNamed<T extends { id: string, name: string }>(entities: T[]) {
        const session = store.openSession();
        for (const entity of entities) {
            await session.store(entity, entity.id);
        }
        await session.saveChanges();
    }

    async function rename(id: string, name: string) {
        const session = store.openSession();
        const entity = await session.load<{ name: string }>(id);
        entity.name = name;
        await session.saveChanges();
    }

    it("deleteRevisionsManuallyEPTest", async () => {
        const user1 = Object.assign(new User(), { id: "Users/1-A", name: "Shahar1" });
        const user2 = Object.assign(new User(), { id: "Users/2-B", name: "Shahar2" });
        const company1 = Object.assign(new Company(), { id: "Companies/1-A", name: "Shahar1" });
        const company2 = Object.assign(new Company(), { id: "Companies/2-B", name: "Shahar2" });
        const company3 = Object.assign(new Company(), { id: "Companies/3-C", name: "Shahar3" });
        const ids = [user1.id, user2.id, company1.id, company2.id, company3.id];

        await setupRevisions();
        await storeNamed([user1, user2, company1, company2, company3]);

        let from: Date;
        let to: Date;

        for (let i = 0; i < 10; i++) {
            const session = store.openSession();
            for (const id of ids) {
                const entity = await session.load<{ name: string }>(id);
                entity.name = `${id}_${i}`;
            }

            if (i === 9) {
                to = new Date();
            }

            await session.saveChanges();

            if (i === 5) {
                from = new Date();
            }
        }

        let user1RevisionsToDelete: string[];

        {
            const session = store.openSession();
            for (const id of ids) {
                assert.strictEqual(await session.advanced.revisions.getCountFor(id), 11);
            }

            const changeVectors = await getRevisionsChangeVectors(session, user1.id);
            user1RevisionsToDelete = [changeVectors[6], changeVectors[5], changeVectors[7]];
        }

        const result = await store.maintenance.send(new DeleteRevisionsOperation(user1.id, user1RevisionsToDelete));
        assert.strictEqual(result.totalDeletes, 3);

        const result2 = await store.maintenance.send(new DeleteRevisionsOperation(company1.id));
        assert.strictEqual(result2.totalDeletes, 11);

        const result3 = await store.maintenance.send(new DeleteRevisionsOperation(company2.id, from, to));
        assert.strictEqual(result3.totalDeletes, 3);

        {
            const session = store.openSession();
            assert.strictEqual(await session.advanced.revisions.getCountFor(user1.id), 11 - 3);
            assert.strictEqual(await session.advanced.revisions.getCountFor(user2.id), 11);
            assert.strictEqual(await session.advanced.revisions.getCountFor(company1.id), 0);
            assert.strictEqual(await session.advanced.revisions.getCountFor(company2.id), 11 - 3);
            assert.strictEqual(await session.advanced.revisions.getCountFor(company3.id), 11);

            const changeVectors = await getRevisionsChangeVectors(session, user1.id);
            const notDeleted = changeVectors.filter(x => user1RevisionsToDelete.includes(x));
            assert.deepStrictEqual(notDeleted, []);
        }
    });

    it("deleteRevisionsManuallyEpMultipleIDsTest", async () => {
        const companies = ["Companies/1-A", "Companies/2-B", "Companies/3-C", "Companies/4-C"]
            .map(id => Object.assign(new Company(), { id, name: "RavenDB_0" }));
        const [company1, company2, company3, company4] = companies;

        await setupRevisions(4);
        await storeNamed(companies);

        for (let i = 1; i < 4; i++) {
            await rename(company1.id, `RavenDB_${i}`);
        }

        for (let i = 1; i < 12; i++) {
            await rename(company2.id, `RavenDB_${i}`);
        }

        for (let i = 1; i < 8; i++) {
            await rename(company3.id, `RavenDB_${i}`);
        }

        for (let i = 1; i < 12; i++) {
            await rename(company4.id, `RavenDB_${i}`);
        }

        {
            const session = store.openSession();
            assert.strictEqual(await session.advanced.revisions.getCountFor(company1.id), 4);
            assert.strictEqual(await session.advanced.revisions.getCountFor(company2.id), 12);
            assert.strictEqual(await session.advanced.revisions.getCountFor(company3.id), 8);
            assert.strictEqual(await session.advanced.revisions.getCountFor(company4.id), 12);
        }

        const result = await store.maintenance.send(new DeleteRevisionsOperation(companies.map(x => x.id)));
        assert.strictEqual(result.totalDeletes, 12 * 3);

        {
            const session = store.openSession();
            for (const company of companies) {
                assert.strictEqual(await session.advanced.revisions.getCountFor(company.id), 0);
            }
        }
    });

    it("rejects invalid parameters before sending the request", () => {
        assert.throws(() => new DeleteRevisionsOperation([]), { name: "InvalidArgumentException" });
        assert.throws(() => new DeleteRevisionsOperation(["users/1", ""]), { name: "InvalidArgumentException" });
        assert.throws(
            () => new DeleteRevisionsOperation("users/1", new Date(2000), new Date(1000)),
            { name: "InvalidArgumentException" });
        assert.throws(() => new DeleteRevisionsOperation("users/1", ["A:1", ""]), { name: "InvalidArgumentException" });
    });
});
