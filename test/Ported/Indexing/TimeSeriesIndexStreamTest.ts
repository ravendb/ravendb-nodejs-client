import { AbstractTimeSeriesIndexCreationTask, IDocumentStore, StreamResult } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import moment = require("moment");
import { Company } from "../../Assets/Orders";
import * as StreamUtil from "../../../src/Utility/StreamUtil";
import { assertThat } from "../../Utils/AssertExtensions";

describe("TimeSeriesIndexStreamTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("basicMapIndex", async () => {
        const now1 = moment().startOf("day");
        const now2 = now1.clone().add(1, "second");

        {
            const session = store.openSession();
            const company = new Company();
            await session.store(company, "companies/1");

            const ts = session.timeSeriesFor(company, "HeartRate");

            for (let i = 0; i < 10; i++) {
                ts.append(now1.clone().add(i, "minutes").toDate(), i, "tag");
            }

            await session.saveChanges();
        }

        const timeSeriesIndex = new MyTsIndex();
        await timeSeriesIndex.execute(store);

        await testContext.waitForIndexing(store);

        {
            const session = store.openSession();
            let i = 0;

            const queryStream = await session.advanced.stream(session.query<IndexResult>({
                index: MyTsIndex,
                documentType: IndexResult
            }));

            queryStream.on("data", (item: StreamResult<IndexResult>) => {
                const results = item.document;
                assertThat(item.document instanceof IndexResult)
                    .isTrue();
                assertThat(moment(results.timestamp).toDate().getTime())
                    .isEqualTo(now1.clone().add(i, "minutes").toDate().getTime());
                assertThat(results.heartBeat)
                    .isEqualTo(i);
                assertThat(results.user)
                    .isEqualTo("companies/1");
                i++;
            });

            await StreamUtil.finishedAsync(queryStream);

            assertThat(i)
                .isEqualTo(10);
        }
    });
});


class MyTsIndex extends AbstractTimeSeriesIndexCreationTask {
    public constructor() {
        super();

        this.map = "from ts in timeSeries.Companies.HeartRate " +
            "from entry in ts.Entries " +
            "select new { " +
            "   heartBeat = entry.Values[0], " +
            "   timestamp = entry.Timestamp, " +
            "   user = ts.DocumentId " +
            "}";
    }
}

class IndexResult {
    heartBeat: number;
    timestamp: string;
    user: string;
}
