import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import {
    IDocumentStore,
    PutDocumentCommand,
} from "../../../src";
import { assertThat } from "../../Utils/AssertExtensions";

describe("PutDocumentCommand", function () {

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

    it("can put document using command", async () => {
        const user = new User();
        user.name = "Marcin";
        user.age = 30;

        const putDocCmd = new PutDocumentCommand("users/1", null, user);
        await store.getRequestExecutor().execute(putDocCmd);
        const result = putDocCmd.result;

        assert.strictEqual(result.id, "users/1");
        assert.ok(result.changeVector);

        const session = store.openSession();
        const loadedUser = await session.load<User>("users/1", {
            documentType: User
        });
        assert.ok(loadedUser);
        assert.strictEqual(loadedUser.name, user.name);
        assert.strictEqual(loadedUser.age, user.age);
        assert.strictEqual(loadedUser.constructor, User);
    });


    it("canPutDocumentUsingCommandWithSurrogatePairs", async () => {
        const nameWithEmojis = "Marcin \uD83D\uDE21\uD83D\uDE21\uD83E\uDD2C\uD83D\uDE00😡😡🤬😀";

        const user = new User();
        user.name = nameWithEmojis;
        user.age = 31;

        let node = store.conventions.objectMapper.toObjectLiteral(user);

        const command = new PutDocumentCommand("users/2", null, node);
        await store.getRequestExecutor().execute(command);

        const result = command.result;


        assertThat(result.id)
            .isEqualTo("users/2");
        assertThat(result.changeVector)
            .isNotNull();

        const session = store.openSession();
        try {
            const loadedUser = await session.load("users/2", User);

            assertThat(loadedUser.name)
                .isEqualTo(nameWithEmojis);
        } finally {
            session.dispose();
        }
    });

});
