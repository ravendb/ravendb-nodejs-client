import * as assert from "node:assert";
import { disposeTestDocumentStore, RavenTestContext, testContext } from "../../../../Utils/TestUtil.js";
import {
    DatabaseRecordBuilder,
    GetDetailedStatisticsOperation,
    GetStatisticsOperation,
    IDocumentStore
} from "../../../../../src/index.js";
import { User } from "../../../../Assets/Entities.js";

describe("GetStatisticsOperationTests", function () {

    let store: IDocumentStore;

    beforeEach(async () => {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () => await disposeTestDocumentStore(store));

    it("canGetStatisticsForNode", async () => {
        const statistics = await store.maintenance.forNode("A").send(new GetStatisticsOperation());
        assert.ok(statistics);
        assert.strictEqual(statistics.countOfDocuments, 0);

        await assert.rejects(() => store.maintenance.forNode("Z").send(new GetStatisticsOperation()));
    });
});

(RavenTestContext.isPullRequest ? describe.skip : describe)("GetStatisticsOperationTests sharded", function () {

    let store: IDocumentStore;

    beforeEach(async () => {
        testContext.customizeDbRecord = record => {
            record.sharding = DatabaseRecordBuilder.create()
                .sharded(record.databaseName, b => b
                    .orchestrator(o => o.addNode("A"))
                    .addShard(0, s => s.addNode("A"))
                    .addShard(1, s => s.addNode("A"))
                    .addShard(2, s => s.addNode("A")))
                .toDatabaseRecord()
                .sharding;
        };

        store = await testContext.getDocumentStore();
    });

    afterEach(async () => {
        testContext.customizeDbRecord = null;
        await disposeTestDocumentStore(store);
    });

    it("canGetStatistics", async () => {
        const session = store.openSession();
        for (let i = 0; i < 20; i++) {
            const user = new User();
            user.age = i;
            await session.store(user);
        }
        await session.saveChanges();

        let total = 0;
        for (let shardNumber = 0; shardNumber < 3; shardNumber++) {
            const statistics = await store.maintenance.forShard(shardNumber).send(new GetStatisticsOperation());
            assert.ok(statistics);
            assert.notStrictEqual(statistics.countOfDocuments, 0);
            total += statistics.countOfDocuments;
        }

        assert.strictEqual(total, 20 + 1); // +1 for hilo
    });

    it("getStatistics_ShouldThrow", async () => {
        await assert.rejects(() => store.maintenance.send(new GetStatisticsOperation()),
            /Query string nodeTag is mandatory, but wasn't specified/);

        await assert.rejects(() => store.maintenance.forNode("A").send(new GetStatisticsOperation()),
            /Query string shardNumber is mandatory, but wasn't specified/);

            await assert.rejects(() => store.maintenance.send(new GetDetailedStatisticsOperation()),
                /Query string nodeTag is mandatory, but wasn't specified/);

            await assert.rejects(() => store.maintenance.forNode("A").send(new GetDetailedStatisticsOperation()),
                /Query string shardNumber is mandatory, but wasn't specified/);
    });
});
