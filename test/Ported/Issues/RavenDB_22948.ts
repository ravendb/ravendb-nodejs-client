import assert from "node:assert";
import { DocumentStore, IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class User {
    public id: string;
    public name: string;
    public testId: string;
}

const doc1Id = "users/1";
const doc2Id = "users/2";

describe("RavenDB_22948", function () {

    let defaultStore: IDocumentStore;
    let customStore: DocumentStore;

    beforeEach(async function () {
        defaultStore = await testContext.getDocumentStore();
        customStore = new DocumentStore(defaultStore.urls, defaultStore.database);
        customStore.conventions.identityProperty = "testId";
        customStore.initialize();
    });

    afterEach(async () => {
        customStore.dispose();
        await disposeTestDocumentStore(defaultStore);
    });

    async function storeUsersWithBothIdHandlings(): Promise<void> {
        {
            const session1 = defaultStore.openSession();
            await session1.store(Object.assign(new User(), {
                id: doc1Id,
                testId: "users/1-T",
                name: "Default Store User"
            }));
            await session1.saveChanges();
        }

        {
            const session2 = customStore.openSession();
            await session2.store(Object.assign(new User(), {
                id: "users/2-T",
                testId: doc2Id,
                name: "Custom Store User"
            }));
            await session2.saveChanges();

            const user1 = await session2.load(doc1Id, User);
            user1.id = "users/3";
            await session2.store(user1);
            await session2.saveChanges();
        }
    }

    it("test two clients different id handling", async () => {
        await storeUsersWithBothIdHandlings();

        {
            const session1 = defaultStore.openSession();
            const results = await session1.query(User)
                .selectFields<Pick<User, "id" | "testId">>(["id", "testId"])
                .all();
            assert.strictEqual(results[0].testId, null);
            assertThat(results[0].id).isEqualTo(doc2Id);
            assert.strictEqual(results[1].testId, null);
            assertThat(results[1].id).isEqualTo(doc1Id);
        }

        {
            const session2 = customStore.openSession();
            const results = await session2.query(User)
                .selectFields<Pick<User, "id" | "testId">>(["id", "testId"])
                .all();
            assertThat(results[0].id).isEqualTo("users/2-T");
            assertThat(results[0].testId).isEqualTo(doc2Id);
            assertThat(results[1].id).isEqualTo("users/3");
            assertThat(results[1].testId).isEqualTo(doc1Id);
        }
    });
});
