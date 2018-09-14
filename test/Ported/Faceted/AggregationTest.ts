import * as moment from "moment";
import * as mocha from "mocha";
import * as BluebirdPromise from "bluebird";
import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import {
    RavenErrorType,
    GetNextOperationIdCommand,
    IDocumentStore,
    AbstractIndexCreationTask,
    RangeBuilder,
} from "../../../src";

// tslint:disable-next-line:class-name
class ItemsOrders_All extends AbstractIndexCreationTask {
    public constructor() {
        super();
        this.map = `docs.ItemsOrders.Select(order => new { 
                order.at,
                order.items 
            })`;
    }
}

// tslint:disable-next-line:class-name
class Orders_All extends AbstractIndexCreationTask {
    public constructor() {
        super();
        this.map = `docs.Orders.Select(order => new { 
            order.currency, 
            order.product,
            order.total,
            order.quantity,
            order.region,
            order.at,
            order.tax 
        })`;
    }
}

type Currency = "EUR" | "PLN" | "NIS";

class Order {
    public currency: Currency;
    public product: string;
    public total: number;
    public region: number;
}

class ItemsOrder {
    public items: string[];
    public at: Date;
}

describe("AggregationTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    describe("with Orders/All index", () => {

        let ordersAllIndex: Orders_All;

        beforeEach(async () => {
            ordersAllIndex = new Orders_All();
            await ordersAllIndex.execute(store);
        });

        it("can correctly aggregate - double", async () => {
            {
                const session = store.openSession();
                const obj = new Order();
                obj.currency = "EUR";
                obj.product = "Milk";
                obj.total = 1.1;
                obj.region = 1;

                const obj2 = new Order();
                obj2.currency = "EUR";
                obj2.product = "Milk";
                obj2.total = 1;
                obj2.region = 1;

                await session.store(obj);
                await session.store(obj2);
                await session.saveChanges();
            }

            await testContext.waitForIndexing(store);

            {
                const session = store.openSession();
                const result = await session.query({ indexName: ordersAllIndex.getIndexName() })
                    .aggregateBy(x => x.byField("region")
                        .maxOn("total")
                        .minOn("total"))
                    .execute();

                const facetResult = result["region"];
                assert.equal(facetResult.values[0].count, 2);
                assert.equal(facetResult.values[0].min, 1);
                assert.equal(facetResult.values[0].max, 1.1);
            }
        });

        it("can correctly aggregate - multiple items", async () => {
            {
                const session = store.openSession();
                const obj = new Order();
                obj.currency = "EUR";
                obj.product = "Milk";
                obj.total = 3;

                const obj2 = new Order();
                obj2.currency = "NIS";
                obj2.product = "Milk";
                obj2.total = 9;

                const obj3 = new Order();
                obj3.currency = "EUR";
                obj3.product = "iPhone";
                obj3.total = 3333;

                await session.store(obj);
                await session.store(obj2);
                await session.store(obj3);
                await session.saveChanges();
            }

            await testContext.waitForIndexing(store);

            {
                const session = store.openSession();
                const r = await session.query({ indexName: ordersAllIndex.getIndexName() })
                    .aggregateBy(x => x.byField("product").sumOn("total"))
                    .andAggregateBy(x => x.byField("currency").sumOn("total"))
                    .execute();

                let facetResult = r["product"];
                assert.equal(facetResult.values.length, 2);
                assert.equal(facetResult.values.filter(x => x.range === "milk")[0].sum, 12);
                assert.equal(facetResult.values.filter(x => x.range === "iphone")[0].sum, 3333);

                facetResult = r["currency"];
                assert.equal(facetResult.values.length, 2);
                assert.equal(facetResult.values.filter(x => x.range === "eur")[0].sum, 3336);
                assert.equal(facetResult.values.filter(x => x.range === "nis")[0].sum, 9);
            }
        });

        it("can correctly aggregate - multiple aggregations", async () => {
            {
                const session = store.openSession();
                const obj = new Order();
                obj.currency = "EUR";
                obj.product = "Milk";
                obj.total = 3;

                const obj2 = new Order();
                obj2.currency = "NIS";
                obj2.product = "Milk";
                obj2.total = 9;

                const obj3 = new Order();
                obj3.currency = "EUR";
                obj3.product = "iPhone";
                obj3.total = 3333;

                await session.store(obj);
                await session.store(obj2);
                await session.store(obj3);
                await session.saveChanges();
            }

            await testContext.waitForIndexing(store);

            {
                const session = store.openSession();
                const r = await session.query({ indexName: ordersAllIndex.getIndexName() })
                    .aggregateBy(x => x.byField("product").maxOn("total").minOn("total"))
                    .execute();

                const facetResult = r["product"];
                assert.equal(facetResult.values.length, 2);
                assert.equal(facetResult.values.filter(x => x.range === "milk")[0].max, 9);
                assert.equal(facetResult.values.filter(x => x.range === "milk")[0].min, 3);
                assert.equal(facetResult.values.filter(x => x.range === "iphone")[0].max, 3333);
                assert.equal(facetResult.values.filter(x => x.range === "iphone")[0].min, 3333);
            }
        });

        it("can correctly aggregate - display name", async () => {
            {
                const session = store.openSession();
                const obj = new Order();
                obj.currency = "EUR";
                obj.product = "Milk";
                obj.total = 3;

                const obj2 = new Order();
                obj2.currency = "NIS";
                obj2.product = "Milk";
                obj2.total = 9;

                const obj3 = new Order();
                obj3.currency = "EUR";
                obj3.product = "iPhone";
                obj3.total = 3333;

                await session.store(obj);
                await session.store(obj2);
                await session.store(obj3);
                await session.saveChanges();
            }

            await testContext.waitForIndexing(store);

            {
                const session = store.openSession();
                const r = await session.query({ indexName: ordersAllIndex.getIndexName() })
                    .aggregateBy(x => x.byField("product")
                        .withDisplayName("productMax").maxOn("total"))
                    .andAggregateBy(x => x.byField("product").withDisplayName("productMin"))
                    .execute();

                assert.equal(Object.keys(r).length, 2);
                assert.ok(r["productMax"]);
                assert.ok(r["productMin"]);
                assert.equal(r["productMax"].values[0].max, 3333);
                assert.equal(r["productMin"].values[1].count, 2);
            }

        });

        it("can correctly aggregate - ranges", async () => {
            {
                const session = store.openSession();
                const obj = new Order();
                obj.currency = "EUR";
                obj.product = "Milk";
                obj.total = 3;

                const obj2 = new Order();
                obj2.currency = "NIS";
                obj2.product = "Milk";
                obj2.total = 9;

                const obj3 = new Order();
                obj3.currency = "EUR";
                obj3.product = "iPhone";
                obj3.total = 3333;

                await session.store(obj);
                await session.store(obj2);
                await session.store(obj3);
                await session.saveChanges();
            }

            await testContext.waitForIndexing(store);

            {
                const session = store.openSession();

                const range = RangeBuilder.forPath("total");

                const r = await session.query({ indexName: ordersAllIndex.getIndexName() })
                    .aggregateBy(f => f.byField("product").sumOn("total"))
                    .andAggregateBy(f => f.byRanges(
                        range.isLessThan(100),
                        range.isGreaterThanOrEqualTo(100).isLessThan(500),
                        range.isGreaterThanOrEqualTo(500).isLessThan(1500),
                        range.isGreaterThanOrEqualTo(1500))
                        .sumOn("total"))
                    .execute();

                let facetResult = r["product"];
                assert.equal(Object.keys(r).length, 2);
                assert.equal(facetResult.values.filter(x => x.range === "milk")[0].sum, 12);
                assert.equal(facetResult.values.filter(x => x.range === "iphone")[0].sum, 3333);

                facetResult = r["total"];
                assert.strictEqual(facetResult.values.length, 4);

                assert.strictEqual(
                    facetResult.values.filter(x => x.range === "total < 100")[0].sum, 12);
                assert.strictEqual(
                    facetResult.values.filter(x => x.range === "total >= 1500")[0].sum, 3333);
            }

        });

    });

    it("can correctly aggregate - with range counts", async () => {

        const idx = new ItemsOrders_All();
        await idx.execute(store);

        const now = moment();
        {
            const session = store.openSession();
            const item1 = new ItemsOrder();
            item1.items = ["first", "second"];
            item1.at = moment(now).toDate();

            const item2 = new ItemsOrder();
            item2.items = ["first", "second"];
            item2.at = moment(now).add(-1, "d").toDate();

            const item3 = new ItemsOrder();
            item3.items = ["first"];
            item3.at = moment(now).toDate();

            const item4 = new ItemsOrder();
            item4.items = ["first"];
            item4.at = moment(now).toDate();

            await session.store(item1);
            await session.store(item2);
            await session.store(item3);
            await session.store(item4);
            await session.saveChanges();
        }

        const oldDate = moment(now).toDate();
        oldDate.setFullYear(1980);

        const minValue = oldDate;
        const end0 = moment(now).add(-2, "d").toDate();
        const end1 = moment(now).add(-1, "d").toDate();
        const end2 = moment(now).toDate();

        await testContext.waitForIndexing(store);

        {
            const session = store.openSession();
            const builder = RangeBuilder.forPath("at");
            const r = await session.query({ indexName: idx.getIndexName() })
                .whereGreaterThanOrEqual("at", end0)
                .aggregateBy(f => f.byRanges(
                    builder.isGreaterThanOrEqualTo(minValue),
                    builder.isGreaterThanOrEqualTo(end0).isLessThan(end1),
                    builder.isGreaterThanOrEqualTo(end1).isLessThan(end2)
                ))
                .execute();
            
            const [ facet1, facet2, facet3 ] = r["at"].values;
            assert.strictEqual(facet1.count, 4);
            assert.strictEqual(facet2.count, 0);
            assert.strictEqual(facet3.count, 1);
        }

    });
});
