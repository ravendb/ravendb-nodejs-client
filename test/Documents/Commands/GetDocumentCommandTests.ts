import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import {
    IDocumentStore,
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
        const session = store.openSession();

        store.conventions.entityKeyCaseConvention = "pascal";

        const user = {
            Name: "Marcin",
            Age: 30
        }; 

        const user2 = {
            Name: "Roman",
            Age: 40,
            Pet: "users/3"
        };

        const user3 = { Name: "Gizmo" };

        await session.store(user, "users/1");
        await session.store(user2, "users/2");
        await session.store(user3, "users/3");
        await session.saveChanges();

        const getDocs = new GetDocumentsCommand({
            ids: [ "users/1", "users/2"],
            includes: [ "Pet" ],
            conventions: store.conventions
        });

        await store.getRequestExecutor().execute(getDocs);
        const users = getDocs.result;

        assert.ok(users);
        assert.ok(users.results && users.results.length);
        assert.ok(users.includes);
        assert.equal(2, users.results.length);
        assert.equal(1, Object.keys(users.includes).length);
        assert.equal(user3.Name, users.includes["users/3"].Name);
        assert.equal(user2.Age, users.results[1].Age);
    });

    it.skip("[NOT IMPL] gets docs having a Map", () => {
    });
});