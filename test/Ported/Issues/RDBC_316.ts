import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { IDocumentStore } from "../../../src/Documents/IDocumentStore";
import { assertThat } from "../../Utils/AssertExtensions";

describe("RDBC_316", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canStoreEqualDocumentUnderTwoDifferentKeys", async () => {
        {
            const session = store.openSession();
            const user1 = Object.assign(new User(), {
                name: "Marcin"
            });

            const user2 = Object.assign(new User(), {
                name: "Marcin"
            });

            await session.store(user1, "users/1");
            await session.store(user2, "users/2");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const user1 = await session.load("users/1", User);
            const user2 = await session.load("users/2", User);

            assertThat(user1)
                .isNotNull();
            assertThat(user2)
                .isNotNull();
            assertThat(user1 === user2)
                .isFalse();
        }
    });
});

class User {
    public name: string;
}