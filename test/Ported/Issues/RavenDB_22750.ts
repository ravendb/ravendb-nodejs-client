import assert from "node:assert";
import {
    AbstractJavaScriptIndexCreationTask,
    IDocumentStore,
    QueryStatistics,
    StopIndexingOperation,
    StreamQueryStatistics
} from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { finishedAsync } from "../../../src/Utility/StreamUtil.js";
import { Company } from "../../Assets/Entities.js";

class Companies_ByName extends AbstractJavaScriptIndexCreationTask<Company, Pick<Company, "name">> {
    constructor() {
        super();
        this.map(Company, c => ({ name: c.name }));
    }
}

// The server reports DateTime.MinValue as the index timestamp of an index that has not run a batch yet.
// The client has to hand that back as a valid Date, the same way it does for a real timestamp.
describe("RavenDB-22750 query statistics of an index that has not run yet", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    function assertValidDate(value: Date, name: string): void {
        assert.ok(value instanceof Date, `${name} should be a Date, got ${typeof value}`);
        assert.ok(!Number.isNaN(value.getTime()), `${name} should be a valid Date`);
    }

    it("indexTimestamp and lastQueryTime are valid dates when the index did not run any batch yet", async () => {
        // stopping indexing before the index is deployed guarantees it never runs a batch
        await store.maintenance.send(new StopIndexingOperation());
        await new Companies_ByName().execute(store);

        const session = store.openSession();
        let stats: QueryStatistics;
        await session.query(Company, Companies_ByName)
            .statistics(s => stats = s)
            .all();

        assertValidDate(stats.indexTimestamp, "indexTimestamp");
        assertValidDate(stats.lastQueryTime, "lastQueryTime");
    });

    it("indexTimestamp and lastQueryTime are valid dates for a collection query", async () => {
        const session = store.openSession();
        let stats: QueryStatistics;
        await session.query(Company)
            .statistics(s => stats = s)
            .all();

        assertValidDate(stats.indexTimestamp, "indexTimestamp");
        assertValidDate(stats.lastQueryTime, "lastQueryTime");
    });

    it("streaming indexTimestamp is a valid date when the index did not run any batch yet", async () => {
        await store.maintenance.send(new StopIndexingOperation());
        await new Companies_ByName().execute(store);

        const session = store.openSession();
        const query = session.query(Company, Companies_ByName);

        let stats: StreamQueryStatistics;
        const reader = await session.advanced.stream(query, s => stats = s);
        reader.on("data", () => { /* drain */ });
        await finishedAsync(reader);

        assert.ok(stats, "stream statistics were not reported");
        // StreamQueryStatistics carries only indexTimestamp, no lastQueryTime
        assertValidDate(stats.indexTimestamp, "indexTimestamp");
    });
});
