import { IDocumentStore } from "../../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../../Utils/TestUtil.js";
import { assertThat } from "../../../Utils/AssertExtensions.js";

class User {
    public id: string;
    public name: string;
    public partnerId: string;
    public email: string;
    public tags: string[];
    public age: number;
    public active: boolean;
}

describe("CachingOfDocumentLoad", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("after modification will get value from server", async () => {
        {
            const s = store.openSession();
            await s.store(Object.assign(new User(), { name: "Ayende" }));
            await s.saveChanges();
        }

        {
            const s = store.openSession();
            await s.load("users/1-A", User);
            await s.saveChanges();
        }

        {
            const s = store.openSession();
            const user = await s.load("users/1-A", User);
            user.name = "Rahien";
            assertThat(s.advanced.requestExecutor.cache.numberOfItems)
                .isEqualTo(1);
            await s.saveChanges();
        }

        {
            const s = store.openSession();
            await s.load("users/1-A", User);
            assertThat(s.advanced.requestExecutor.cache.numberOfItems)
                .isEqualTo(1);
        }
    });
});
