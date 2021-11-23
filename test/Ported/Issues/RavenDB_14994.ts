import { GetTimeSeriesOperation, IDocumentStore } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { User } from "../../Assets/Entities";
import { assertThat } from "../../Utils/AssertExtensions";
import moment = require("moment");

describe("RavenDB_14994", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("getOnNonExistingTimeSeriesShouldReturnNull", async () => {
        const documentId = "users/ayende";

        {
            const session = store.openSession();
            await session.store(new User(), documentId);
            await session.saveChanges();
        }

        const get = await store.operations.send(new GetTimeSeriesOperation(documentId, "HeartRate"));
        assertThat(get)
            .isNull();

        {
            const session = store.openSession();
            assertThat(await session.timeSeriesFor(documentId, "HeartRate").get())
                .isNull();
        }
    });

    it("getOnEmptyRangeShouldReturnEmptyArray", async () => {
        const documentId = "users/ayende";

        const baseLine = testContext.utcToday();

        {
            const session = store.openSession();
            await session.store(new User(), documentId);

            const tsf = session.timeSeriesFor(documentId, "HeartRate");
            for (let i = 0; i < 10; i++) {
                tsf.append(baseLine.clone().add(i, "minutes").toDate(), i);
            }

            await session.saveChanges();
        }

        const get = await store.operations.send(
            new GetTimeSeriesOperation(
                documentId,
                "HeartRate",
                baseLine.clone().add(-2, "minutes").toDate(),
                baseLine.clone().add(-1, "minutes").toDate()));

        assertThat(get.entries)
            .hasSize(0);

        {
            const session = store.openSession();
            const result = await session.timeSeriesFor(documentId, "HeartRate")
                .get(baseLine.clone().add(-2, "minutes").toDate(), baseLine.clone().add(-1, "minutes").toDate());
            assertThat(result)
                .hasSize(0);
        }
    });
});
