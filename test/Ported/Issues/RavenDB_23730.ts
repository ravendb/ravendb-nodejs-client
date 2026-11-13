import assert from "node:assert";
import { CONSTANTS, DeleteRevisionsOperation, IDocumentSession, IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";

class User {
    public id: string;
    public name: string;
}

describe("RavenDB_23730", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    async function getRevisionsChangeVectors(session: IDocumentSession, id: string): Promise<string[]> {
        const metadata = await session.advanced.revisions.getMetadataFor(id);
        return metadata.map(x => x[CONSTANTS.Documents.Metadata.CHANGE_VECTOR]);
    }

    it("canRecreateForceCreatedRevision", async () => {
        const user = Object.assign(new User(), { id: "Users/1-A", name: "Shahar_old" });
        let revisions: string[];

        {
            const session = store.openSession();
            await session.store(user, user.id);
            await session.saveChanges();

            session.advanced.revisions.forceRevisionCreationFor(user.id);
            await session.saveChanges();

            revisions = await getRevisionsChangeVectors(session, user.id);
            assert.strictEqual(revisions.length, 1);
        }

        await store.maintenance.send(new DeleteRevisionsOperation(user.id, revisions, true));

        {
            const session = store.openSession();
            assert.deepStrictEqual(await getRevisionsChangeVectors(session, user.id), []);

            session.advanced.revisions.forceRevisionCreationFor(user.id);
            await session.saveChanges();

            const recreated = await getRevisionsChangeVectors(session, user.id);
            assert.strictEqual(recreated.length, 1);
        }
    });
});
