import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil";

import {
    IDocumentStore,
} from "../../src";
import { User } from "../Assets/Entities";
import { GetDocumentsCommand } from "../../src/Documents/Commands/GetDocumentsCommand";

describe("CRUD tests", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    it("saves entities using lowercase", async () => {
        const session = store.openSession();
        const user1 = Object.assign(new User(), { lastName: "user1" });
        await session.store(user1, "users/1");
        await session.saveChanges();

        const documentsCommand = new GetDocumentsCommand({
            id: "users/1", 
            includes: null, 
            metadataOnly: false 
        });

        await store.getRequestExecutor().execute(documentsCommand);

        const { result } = documentsCommand;
        const userJson = result.results[0];

        assert.ok(Object.keys(userJson).includes("lastName"));

        {
            const newSession = store.openSession();
            const users = await newSession.advanced
                .rawQuery<User>("from Users where lastName = 'user1'", User)
                .all();
            assert.equal(users.length, 1);
        }
    });
});
