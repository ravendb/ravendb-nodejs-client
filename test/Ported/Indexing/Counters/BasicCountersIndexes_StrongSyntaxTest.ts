import { disposeTestDocumentStore, testContext } from "../../../Utils/TestUtil";
import { AbstractCountersIndexCreationTask, IDocumentStore } from "../../../../src";
import { Company } from "../../../Assets/Orders";
import { assertThat } from "../../../Utils/AssertExtensions";

describe("BasicCountersIndexes_StrongSyntaxTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("basicMapIndex", async () => {
        {
            const session = store.openSession();

            const company = new Company();
            await session.store(company, "companies/1");
            session.countersFor(company)
                .increment("HeartRate", 7);
            await session.saveChanges();
        }

        const myCounterIndex = new MyCounterIndex();
        await myCounterIndex.execute(store);

        await testContext.waitForIndexing(store);

        {
            const session = store.openSession();
            const results = await session.query<IndexResult>({
                index: MyCounterIndex,
                documentType: IndexResult
            }).all();

            assertThat(results)
                .hasSize(1);

            const result = results[0];

            assertThat(result.heartBeat)
                .isEqualTo(7);
            assertThat(result.user)
                .isEqualTo("companies/1");
            assertThat(result.name)
                .isEqualTo("HeartRate");
        }
    });
});

class MyCounterIndex extends AbstractCountersIndexCreationTask {
    public constructor() {
        super();

        this.map = "counters.Companies.HeartRate.Select(counter => new {\n" +
            "    heartBeat = counter.Value,\n" +
            "    name = counter.Name,\n" +
            "    user = counter.DocumentId\n" +
            "})";
    }
}


class IndexResult {
    public heartBeat: string;
    public name: string;
    public user: string;
}