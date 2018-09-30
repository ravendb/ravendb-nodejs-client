import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil";
import {
    IDocumentStore,
    DocumentStore
} from "../../../src";
import { GetDocumentsCommand } from "../../../src/Documents/Commands/GetDocumentsCommand";

describe("GetDocumentCommand streaming", function () {

    let store: IDocumentStore;

    class User {
        public name: string;
        public age: number;
    }

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("with key case transform", async () => {
        let customStore: DocumentStore;
        try {
            customStore = new DocumentStore(store.urls, store.database);
            customStore.conventions.entityFieldNameConvention = "pascal";
            customStore.conventions.remoteEntityFieldNameConvention = "camel";
            customStore.initialize();

            const session = store.openSession();

            const user = {
                Name: "Marcin",
                Age: 30,
                Pet: "users/4"
            };

            const user2 = {
                Name: "Roman",
                Age: 40,
                Pet: "users/3"
            };

            const user3 = { Name: "Gizmo" };
            const user4 = { Name: "Dumbo" };

            await session.store(user, "users/1");
            await session.store(user2, "users/2");
            await session.store(user3, "users/3");
            await session.store(user4, "users/4");
            await session.saveChanges();

            const getDocs = new GetDocumentsCommand({
                ids: ["users/1", "users/2"],
                includes: ["Pet"],
                conventions: store.conventions
            });

            await store.getRequestExecutor().execute(getDocs);
            const users = getDocs.result;

            assert.ok(users);
            assert.ok(users.results && users.results.length);
            assert.ok(users.includes);
            assert.strictEqual(users.results.length, 2);
            assert.strictEqual(Object.keys(users.includes).length, 2);
            assert.strictEqual(user3.Name, users.includes["users/3"].Name);
            assert.strictEqual(user2.Age, users.results[1].Age);
        } finally {
            if (customStore) {
                customStore.dispose();
            }
        }
    });

    it("gets docs having a Map");
});
