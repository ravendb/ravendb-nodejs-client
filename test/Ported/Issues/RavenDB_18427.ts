import { IDocumentStore } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { User } from "../../Assets/Entities";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions";

describe("RavenDB_18427Test", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("store_documents2", async () => {
        {
            const session = store.openSession();
            const user = new User();
            user.name = "Foo/Bar";
            await session.store(user, "foo");
            await session.store(user, "Foo");

            await assertThrows(() => session.store(user, "bar"), err => {
                assertThat(err.name)
                    .isEqualTo("InvalidOperationException");
            });
            await session.saveChanges();

            const usersCount = await session.query(User)
                .count();

            assertThat(usersCount)
                .isEqualTo(1);

            const user1 = await session.load("foo", User);
            assertThat(user1)
                .isNotNull();
            const user2 = await session.load("bar", User);
            assertThat(user2)
                .isNull();
        }
    });
});
