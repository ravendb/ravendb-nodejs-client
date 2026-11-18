import assert from "node:assert";
import {
    AbstractCsharpIndexCreationTask,
    IDocumentStore,
    QueryInspectionNode,
    QueryTimings
} from "../../../src/index.js";
import { INDEXES } from "../../../src/Constants.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";

function planOperations(node: QueryInspectionNode): string[] {
    return [node.operation, ...(node.children ?? []).flatMap(planOperations)];
}

function planContains(node: QueryInspectionNode, operation: string): boolean {
    return planOperations(node).some(x => x.includes(operation));
}

async function getCoraxStore() {
    return testContext.getDocumentStore("QueryPlanTest", false, null, record => {
        record.settings[INDEXES.INDEXING_AUTO_SEARCH_ENGINE_TYPE] = "Corax";
        record.settings[INDEXES.INDEXING_STATIC_SEARCH_ENGINE_TYPE] = "Corax";
    });
}

describe("QueryPlanTest", function () {

    let store: IDocumentStore;

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    describe("RavenDB_25930", function () {

        class Dto {
            public id: string;
            public name: string;
            public count: number;
        }

        class Dtos_ByNameAndCount extends AbstractCsharpIndexCreationTask {
            public constructor() {
                super();
                this.map = "from doc in docs.Dtos select new { doc.name, doc.count }";
                this.compoundField("name", "count");
            }
        }

        it("compoundFieldShouldNotImpactQueryBuilderPlanWhenIsNotUsed", async () => {
            store = await getCoraxStore();

            {
                const session = store.openSession({ noCaching: true });
                await session.store(Object.assign(new Dto(), { name: "1", count: 1 }));
                await session.store(Object.assign(new Dto(), { name: "1", count: 2 }));
                await session.saveChanges();
            }

            await new Dtos_ByNameAndCount().execute(store);
            await testContext.waitForIndexing(store);

            {
                const session = store.openSession({ noCaching: true });
                let timings: QueryTimings;
                await session.query(Dto, Dtos_ByNameAndCount)
                    .timings(x => timings = x)
                    .whereEquals("name", "1")
                    .andAlso()
                    .whereGreaterThan("count", 0)
                    .all();

                assert.ok(planContains(timings.queryPlan, "UnaryMatch"), planOperations(timings.queryPlan).join(" -> "));
            }

            {
                const session = store.openSession({ noCaching: true });
                let timings: QueryTimings;
                const result = await session.query(Dto, Dtos_ByNameAndCount)
                    .timings(x => timings = x)
                    .whereEquals("name", "1")
                    .andAlso()
                    .whereGreaterThan("count", 0)
                    .orderBy("count", "Long")
                    .all();

                assert.ok(planContains(timings.queryPlan, "UnaryMatch"), planOperations(timings.queryPlan).join(" -> "));
                assert.deepStrictEqual(result.map(x => x.count), [1, 2]);
            }
        });
    });

    describe("RavenDB_27564", function () {

        class Item {
            public id: string;
            public position: number;
        }

        class Items_ByPosition extends AbstractCsharpIndexCreationTask {
            public constructor() {
                super();
                this.map = "from i in docs.Items select new { i.position }";
            }
        }

        it("anOrdinaryPagedOrderByStillUsesTheScan", async () => {
            store = await getCoraxStore();

            {
                const session = store.openSession();
                for (let i = 1; i <= 5; i++) {
                    await session.store(Object.assign(new Item(), { position: i }), `items/${i}`);
                }
                await session.saveChanges();
            }

            await new Items_ByPosition().execute(store);
            await testContext.waitForIndexing(store);

            const session = store.openSession();
            let timings: QueryTimings;
            const results = await session.advanced
                .rawQuery("from index 'Items/ByPosition' order by position as long limit 2 include timings()", Item)
                .timings(x => timings = x)
                .all();

            assert.deepStrictEqual(results.map(x => x.id), ["items/1", "items/2"]);
            assert.ok(planContains(timings.queryPlan, "TermNumericRangeProvider"), planOperations(timings.queryPlan).join(" -> "));
            assert.ok(!planContains(timings.queryPlan, "SortingMatch"), planOperations(timings.queryPlan).join(" -> "));
        });
    });
});
