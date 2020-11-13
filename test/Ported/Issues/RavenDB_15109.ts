import { IDocumentStore } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { User } from "../../Assets/Entities";
import { assertThat } from "../../Utils/AssertExtensions";

describe("RavenDB_15109", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("bulkIncrementNewCounterShouldAddCounterNameToMetadata", async () => {
        let id: string;

        {
            const bulkInsert = store.bulkInsert();
            const user = new User();
            user.name = "Aviv1";
            await bulkInsert.store(user);

            id = user.id;

            const counter = bulkInsert.countersFor(id);
            for (let i = 1; i <= 10; i++) {
                await counter.increment(i.toString(), i);
            }

            await bulkInsert.finish();
        }

        {
            const session = store.openSession();
            const all = await session.countersFor(id).getAll();
            assertThat(all)
                .hasSize(10);
        }

        {
            const session = store.openSession();
            const u = await session.load<User>(id, User);
            const counters = session.advanced.getCountersFor(u);
            assertThat(counters)
                .isNotNull()
                .hasSize(10);
        }
    });

    it("bulkIncrementNewTimeSeriesShouldAddTimeSeriesNameToMetadata", async () => {
        let id: string;

        {
            const bulkInsert = store.bulkInsert();
            const user = new User();
            user.name = "Aviv1";
            await bulkInsert.store(user);

            id = user.id;

            for (let i = 1; i <= 10; i++) {
                const timeSeries = bulkInsert.timeSeriesFor(id, i.toString());
                await timeSeries.append(new Date(), i);
                timeSeries.dispose();
            }

            await bulkInsert.finish();
        }

        {
            const session = store.openSession();
            for (let i = 1; i <= 10; i++) {
                const all = await session.timeSeriesFor(id, i.toString()).get();
                assertThat(all)
                    .hasSize(1);
            }
        }

        {
            const session = store.openSession();
            const u = await session.load<User>(id, User);
            const timeSeries = session.advanced.getTimeSeriesFor(u);
            assertThat(timeSeries)
                .isNotNull()
                .hasSize(10);
        }
    });
});