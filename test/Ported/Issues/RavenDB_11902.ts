import { GetStatisticsOperation, IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { User } from "../../Assets/Entities.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

describe("RavenDB_11902", function () {
    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    const ids = ["GeoData/D'horn/113736", "GeoData/D\"horn/113736", "GeoData/D\\\"horn/113736"];

    it("can insert doc with single quotation char in id", async () => {
        for (const id of ids) {
            const session = store.openSession();
            await session.store(Object.assign(new User(), { id }));
            await session.saveChanges();
        }

        for (const id of ids) {
            const bulk = store.bulkInsert();
            await bulk.store(Object.assign(new User(), { id }));
            await bulk.finish();
        }

        const stats = await store.maintenance.send(new GetStatisticsOperation());
        assertThat(stats.countOfDocuments).isEqualTo(2 + 1);
    });
});
