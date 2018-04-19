import * as mocha from "mocha";
import * as BluebirdPromise from "bluebird";
import * as assert from "assert";
import { RemoteTestContext, globalContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import {
    RequestExecutor,
    DocumentConventions,
    RavenErrorType,
    GetNextOperationIdCommand,
    IDocumentStore,
    PutDocumentCommand,
} from "../../../src";

describe.only("PutDocumentCommand", function () {

    let store: IDocumentStore;

    class User {
        public name: string;
        public age: number;
    }

    beforeEach(async function () {
        store = await globalContext.getDocumentStore();
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    it("can put document using command", async () => {
        const user = new User();
        user.name = "Marcin";
        user.age = 30;

        const putDocCmd = new PutDocumentCommand("users/1", null, user);
        await store.getRequestExecutor().execute(putDocCmd);
        const result = putDocCmd.result;

        assert.equal(result.id, "users/1");
        assert.ok(result.changeVector);

        const session = store.openSession();
        debugger;
        const loadedUser = await session.load<User>("users/1");
        assert.equal(loadedUser.name, user.name);
        assert.equal(loadedUser.age, user.age);
        assert.equal(loadedUser.constructor, User);
        //     assertThat(loadedUser.getName())
        //             .isEqualTo("Marcin");
        // }
    });
});
