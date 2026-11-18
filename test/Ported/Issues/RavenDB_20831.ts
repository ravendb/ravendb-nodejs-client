import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";
import { User } from "../../Assets/Entities.js";

describe("RavenDB_20831", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("can use longCountLazily", async () => {
        {
            const session = store.openSession();
            const user = new User();
            user.name = "John";
            await session.store(user);
            await session.saveChanges();
        }

        {
            const session = store.openSession();

            const count = session.query(User)
                .whereNotEquals("name", null)
                .countLazily();

            assertThat(await count.getValue())
                .isEqualTo(1);

            const longCount = session.query(User)
                .whereNotEquals("name", null)
                .longCountLazily();

            assertThat(await longCount.getValue())
                .isEqualTo(1);
        }

        {
            const session = store.openSession();

            const count = session.advanced.documentQuery(User)
                .whereNotEquals("name", null)
                .countLazily();

            assertThat(await count.getValue())
                .isEqualTo(1);

            const longCount = session.advanced.documentQuery(User)
                .whereNotEquals("name", null)
                .longCountLazily();

            assertThat(await longCount.getValue())
                .isEqualTo(1);
        }
    });
});
