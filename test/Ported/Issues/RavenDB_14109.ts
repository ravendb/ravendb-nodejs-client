import { IDocumentStore } from "../../../src/Documents/IDocumentStore";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { Company } from "../../Assets/Orders";
import * as StreamUtil from "../../../src/Utility/StreamUtil";
import { StreamQueryStatistics } from "../../../src/Documents/Session/StreamQueryStatistics";
import { assertThat } from "../../Utils/AssertExtensions";

describe("RavenDB_14109Test", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it.skip("queryStatsShouldBeFilledBeforeCallingMoveNext", async () => {
        {
            const session = store.openSession();
            await session.store(new Company());
            await session.store(new Company());

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const query = await session.query(Company);
            let stats: StreamQueryStatistics;

            const queryStream = await session.advanced.stream(query, s => stats = s);

            assertThat(stats.totalResults)
                .isEqualTo(2);

            const items = [];
            queryStream.on("data", item => {
                items.push(item);
            });

            await StreamUtil.finishedAsync(queryStream);

            assertThat(items)
                .hasSize(stats.totalResults);
        }
    });
});