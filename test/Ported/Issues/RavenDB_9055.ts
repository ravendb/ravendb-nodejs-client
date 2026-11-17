import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";
import { User } from "../../Assets/Entities.js";

describe("RavenDB_9055", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("aggressivelyCacheWorksWhenTopologyUpdatesIsDisable", async () => {
        {
            const session = store.openSession();
            await session.store(Object.assign(new User(), { name: "Idan" }), "users/1");
            await session.saveChanges();
        }

        let notified = false;
        const changeVector = await store.aggressivelyCache(async () => {
            const forAllDocuments = store.changes().forAllDocuments();
            forAllDocuments.on("data", () => notified = true);
            await forAllDocuments.ensureSubscribedNow();

            const session = store.openSession();
            const user = await session.load("users/1", User);
            user.name = "Shalom";
            await session.saveChanges();
            return session.advanced.getChangeVectorFor(user);
        });

        assertThat(await testContext.waitForValue(async () => notified, true)).isTrue();
        assertThat(changeVector).isNotNull();

        const updatedChangeVector = await testContext.waitForValue(() => store.aggressivelyCache(async () => {
            const session = store.openSession();
            const user = await session.load("users/1", User);
            return session.advanced.getChangeVectorFor(user);
        }), changeVector);

        assertThat(updatedChangeVector).isEqualTo(changeVector);
    });
});
