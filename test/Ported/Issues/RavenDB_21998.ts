import assert from "node:assert";
import {
    AbstractCsharpIndexCreationTask,
    IDocumentStore,
    QueryTimings
} from "../../../src/index.js";
import { INDEXES } from "../../../src/Constants.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";

const NUMBER_OF_DOCS_TO_PUT = 5000;

class Question {
    public id: string;
    public community: string;
    public createdAt: Date;
    public someValue: number;
}

class DummyIndex extends AbstractCsharpIndexCreationTask {
    public constructor() {
        super();
        this.map = "from question in docs.Questions select new { question.community, question.createdAt, question.someValue }";
    }
}

describe("RavenDB_21998", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore("RavenDB_21998", false, null, record => {
            record.settings[INDEXES.INDEXING_AUTO_SEARCH_ENGINE_TYPE] = "Corax";
            record.settings[INDEXES.INDEXING_STATIC_SEARCH_ENGINE_TYPE] = "Corax";
        });

        const bulkInsert = store.bulkInsert();
        for (let i = 1; i <= NUMBER_OF_DOCS_TO_PUT; i++) {
            await bulkInsert.store(Object.assign(new Question(), { community: "SomeCommunity", someValue: i }), `questions/${i}`);
        }
        await bulkInsert.finish();

        await new DummyIndex().execute(store);
        await testContext.waitForIndexing(store);
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("assertNoSortingWhenThereAreNoTermsInOrderByField", async () => {
        const session = store.openSession();
        let timings: QueryTimings;

        const result = await session.query(Question, DummyIndex)
            .timings(x => timings = x)
            .whereEquals("community", "SomeCommunity")
            .orderByDescending("createdAt")
            .all();

        assert.ok(!timings.queryPlan.operation.toLowerCase().includes("sorting"), timings.queryPlan.operation);
        assert.strictEqual(result.length, NUMBER_OF_DOCS_TO_PUT);
    });

    it("assertOnlyFieldsWithNoTermsAreSkipped", async () => {
        const session = store.openSession();
        let timings: QueryTimings;

        const result = await session.query(Question, DummyIndex)
            .timings(x => timings = x)
            .whereEquals("community", "SomeCommunity")
            .orderBy("someValue", "Long")
            .orderBy("createdAt")
            .all();

        const operation = timings.queryPlan.operation.toLowerCase();
        assert.ok(!operation.includes("sortingmultimatch"), operation);
        assert.ok(operation.includes("sortingmatch"), operation);
        assert.strictEqual(result.length, NUMBER_OF_DOCS_TO_PUT);
    });
});
