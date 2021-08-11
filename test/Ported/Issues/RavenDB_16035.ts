import { IDocumentStore } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { assertThat } from "../../Utils/AssertExtensions";

let clearCache = false;

describe("RavenDB_16035Test", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        testContext.customizeStore = async store => {
            store.addSessionListener("succeedRequest", sender => {
                if (clearCache) {
                    store.getRequestExecutor().cache.clear();
                }
            })
        };
        store = await testContext.getDocumentStore();
    });

    afterEach(function () {
        testContext.customizeStore = null;
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canMixLazyAndAggressiveCaching", async () => {
        {
            const session = store.openSession();
            const user = new User();
            user.name = "Arava";
            await session.store(user);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const l1 = session.query(User)
                .whereEquals("name", "Arava")
                .lazily();

            const l2 = session.query(User)
                .whereEquals("name", "Phoebe")
                .lazily();

            const l3 = session.query(User)
                .whereExists("name")
                .countLazily();

            assertThat(await l1.getValue())
                .isNotEmpty();
            assertThat(await l2.getValue())
                .hasSize(0);
            assertThat(await l3.getValue())
                .isEqualTo(1);
        }

        {
            const session = store.openSession();
            clearCache = true;

            const l1 = session.query(User)
                .whereEquals("name", "Arava")
                .lazily();

            const l2 = session.query(User)
                .whereEquals("name", "Phoebe")
                .lazily();

            const l3 = session.query(User)
                .whereExists("name")
                .countLazily();

            assertThat(await l1.getValue())
                .isNotEmpty();
            assertThat(await l2.getValue())
                .hasSize(0);
            assertThat(await l3.getValue())
                .isEqualTo(1);
        }
    });
});

class User {
    public name: string;
}
