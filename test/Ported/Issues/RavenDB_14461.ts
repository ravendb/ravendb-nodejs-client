import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class Company {
}

describe("RavenDB_14461", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    async function assertLoad(ids: string[], noTracking: boolean) {
        {
            const session = store.openSession({ noTracking });
            const objs = await session.load(ids, Company);

            assertThat(objs).isNotNull();
            assertThat(objs).hasSize(0);
        }

        {
            const session = store.openSession({ noTracking });
            const objs = await session.advanced.lazily.load(ids, Company).getValue();

            assertThat(objs).isNotNull();
            assertThat(objs).hasSize(0);
        }
    }

    it("find by empty collection should work", async () => {
        await assertLoad([], false);
        await assertLoad([], true);

        await assertLoad([""], false);
        await assertLoad([""], true);
    });
});
