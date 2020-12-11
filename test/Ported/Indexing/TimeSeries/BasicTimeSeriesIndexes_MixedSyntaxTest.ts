import { GetTermsOperation, IDocumentStore, PutIndexesOperation, TimeSeriesIndexDefinition } from "../../../../src";
import { disposeTestDocumentStore, testContext } from "../../../Utils/TestUtil";
import { Company } from "../../../Assets/Orders";
import { assertThat } from "../../../Utils/AssertExtensions";

describe("BasicTimeSeriesIndexes_MixedSyntaxTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("basicMapIndex", async () => {
        const now1 = testContext.utcToday();

        {
            const session = store.openSession();
            const company = new Company();
            await session.store(company, "companies/1");
            session.timeSeriesFor(company, "HeartRate")
                .append(now1.toDate(), 7, "tag");

            await session.saveChanges();
        }

        const timeSeriesIndexDefinition = new TimeSeriesIndexDefinition();
        timeSeriesIndexDefinition.name = "MyTsIndex";
        timeSeriesIndexDefinition.maps = new Set(["from ts in timeSeries.Companies.HeartRate.Where(x => true) " +
            "from entry in ts.Entries " +
            "select new { " +
            "   heartBeat = entry.Values[0], " +
            "   date = entry.Timestamp.Date, " +
            "   user = ts.DocumentId " +
            "}"]);

        await store.maintenance.send(new PutIndexesOperation(timeSeriesIndexDefinition));
        await testContext.waitForIndexing(store);

        const terms = await store.maintenance.send(new GetTermsOperation("MyTsIndex", "heartBeat", null));
        assertThat(terms)
            .hasSize(1);
        assertThat(terms)
            .contains("7");
    });
});
