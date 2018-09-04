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
                assert.equal(facetResult.values.filter(x => x.range === "EUR")[0].sum, 3336);
                assert.equal(facetResult.values.filter(x => x.range === "NIS")[0].sum, 9);
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
                        range.isGreaterThan(1500)).sumOn("total"))
                    .execute();
                
                let facetResult = r["product"];
                assert.equal(Object.keys(r).length, 2);
                assert.equal(facetResult.values.filter(x => x.range === "milk")[0].sum, 12);
                assert.equal(facetResult.values.filter(x => x.range === "iphone")[0].sum, 3333);

                facetResult = r["total"];
            }

        });

    });

});

    //     public void canCorrectlyAggregate_MultipleItems() throws Exception {
    //         try (IDocumentStore store = getDocumentStore()) {
    //             new Orders_All().execute(store);
    //              try (IDocumentSession session = store.openSession()) {
    //                 Order obj = new Order();
    //                 obj.setCurrency(Currency.EUR);
    //                 obj.setProduct("Milk");
    //                 obj.setTotal(3);
    //                  Order obj2 = new Order();
    //                 obj2.setCurrency(Currency.NIS);
    //                 obj2.setProduct("Milk");
    //                 obj2.setTotal(9);
    //                  Order obj3 = new Order();
    //                 obj3.setCurrency(Currency.EUR);
    //                 obj3.setProduct("iPhone");
    //                 obj3.setTotal(3333);
    //                  session.store(obj);
    //                 session.store(obj2);
    //                 session.store(obj3);
    //                  session.saveChanges();
    //             }
    //              waitForIndexing(store);
    //              try (IDocumentSession session = store.openSession()) {
    //                 Map<String, FacetResult> r = session
    //                         .query(Order.class, Orders_All.class)
    //                         .aggregateBy(x -> x.byField("product").sumOn("total"))
    //                         .andAggregateBy(x -> x.byField("currency").sumOn("total"))
    //                         .execute();
    //                  FacetResult facetResult = r.get("product");
    //                 assertThat(facetResult.getValues().size())
    //                         .isEqualTo(2);
    //                  assertThat(facetResult.getValues().stream().filter(x -> "milk".equals(x.getRange())).findFirst().get().getSum())
    //                         .isEqualTo(12);
    //                  assertThat(facetResult.getValues().stream().filter(x -> "iphone".equals(x.getRange())).findFirst().get().getSum())
    //                         .isEqualTo(3333);
    //                  facetResult = r.get("currency");
    //                 assertThat(facetResult.getValues().size())
    //                         .isEqualTo(2);
    //                  assertThat(facetResult.getValues().stream().filter(x -> "eur".equals(x.getRange())).findFirst().get().getSum())
    //                         .isEqualTo(3336);
    //                  assertThat(facetResult.getValues().stream().filter(x -> "nis".equals(x.getRange())).findFirst().get().getSum())
    //                         .isEqualTo(9);
    //             }
    //         }
    //     }


// public class AggregationTest extends RemoteTestBase {
//      @Test
//     public void canCorrectlyAggregate_MultipleAggregations() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             new Orders_All().execute(store);
//              try (IDocumentSession session = store.openSession()) {
//                 Order obj = new Order();
//                 obj.setCurrency(Currency.EUR);
//                 obj.setProduct("Milk");
//                 obj.setTotal(3);
//                  Order obj2 = new Order();
//                 obj2.setCurrency(Currency.NIS);
//                 obj2.setProduct("Milk");
//                 obj2.setTotal(9);
//                  Order obj3 = new Order();
//                 obj3.setCurrency(Currency.EUR);
//                 obj3.setProduct("iPhone");
//                 obj3.setTotal(3333);
//                  session.store(obj);
//                 session.store(obj2);
//                 session.store(obj3);
//                  session.saveChanges();
//             }
//              waitForIndexing(store);
//              try (IDocumentSession session = store.openSession()) {
//                 Map<String, FacetResult> r = session
//                         .query(Order.class, Orders_All.class)
//                         .aggregateBy(f -> f.byField("product").maxOn("total").minOn("total"))
//                         .execute();
//                  FacetResult facetResult = r.get("product");
//                 assertThat(facetResult.getValues().size())
//                         .isEqualTo(2);
//                  assertThat(facetResult.getValues().stream().filter(x -> "milk".equals(x.getRange())).findFirst().get().getMax())
//                         .isEqualTo(9);
//                  assertThat(facetResult.getValues().stream().filter(x -> "milk".equals(x.getRange())).findFirst().get().getMin())
//                         .isEqualTo(3);
//                  assertThat(facetResult.getValues().stream().filter(x -> "iphone".equals(x.getRange())).findFirst().get().getMax())
//                         .isEqualTo(3333);
//                  assertThat(facetResult.getValues().stream().filter(x -> "iphone".equals(x.getRange())).findFirst().get().getMin())
//                         .isEqualTo(3333);
//             }
//         }
//     }
//      @Test
//     public void canCorrectlyAggregate_DisplayName() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             new Orders_All().execute(store);
//              try (IDocumentSession session = store.openSession()) {
//                 Order obj = new Order();
//                 obj.setCurrency(Currency.EUR);
//                 obj.setProduct("Milk");
//                 obj.setTotal(3);
//                  Order obj2 = new Order();
//                 obj2.setCurrency(Currency.NIS);
//                 obj2.setProduct("Milk");
//                 obj2.setTotal(9);
//                  Order obj3 = new Order();
//                 obj3.setCurrency(Currency.EUR);
//                 obj3.setProduct("iPhone");
//                 obj3.setTotal(3333);
//                  session.store(obj);
//                 session.store(obj2);
//                 session.store(obj3);
//                  session.saveChanges();
//             }
//              waitForIndexing(store);
//              try (IDocumentSession session = store.openSession()) {
//                 Map<String, FacetResult> r = session
//                         .query(Order.class, Orders_All.class)
//                         .aggregateBy(f -> f.byField("product").withDisplayName("productMax").maxOn("total"))
//                         .andAggregateBy(f -> f.byField("product").withDisplayName("productMin"))
//                         .execute();
//                  assertThat(r.size())
//                         .isEqualTo(2);
//                  assertThat(r.get("productMax"))
//                         .isNotNull();
//                  assertThat(r.get("productMin"))
//                         .isNotNull();
//                  assertThat(r.get("productMax").getValues().get(0).getMax())
//                         .isEqualTo(3333);
//                  assertThat(r.get("productMin").getValues().get(1).getCount())
//                         .isEqualTo(2);
//             }
//         }
//     }
//      @Test
//     public void canCorrectlyAggregate_Ranges() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//              new Orders_All().execute(store);
//              try (IDocumentSession session = store.openSession()) {
//                 Order obj = new Order();
//                 obj.setCurrency(Currency.EUR);
//                 obj.setProduct("Milk");
//                 obj.setTotal(3);
//                  Order obj2 = new Order();
//                 obj2.setCurrency(Currency.NIS);
//                 obj2.setProduct("Milk");
//                 obj2.setTotal(9);
//                  Order obj3 = new Order();
//                 obj3.setCurrency(Currency.EUR);
//                 obj3.setProduct("iPhone");
//                 obj3.setTotal(3333);
//                  session.store(obj);
//                 session.store(obj2);
//                 session.store(obj3);
//                  session.saveChanges();
//             }
//              waitForIndexing(store);
//              try (IDocumentSession session = store.openSession()) {
//                 RangeBuilder<Integer> range = RangeBuilder.forPath("total");
//                 Map<String, FacetResult> r = session
//                         .query(Order.class, Orders_All.class)
//                         .aggregateBy(f -> f.byField("product").sumOn("total"))
//                         .andAggregateBy(f -> f.byRanges(
//                                 range.isLessThan(100),
//                                 range.isGreaterThanOrEqualTo(100).isLessThan(500),
//                                 range.isGreaterThanOrEqualTo(500).isLessThan(1500),
//                                 range.isGreaterThanOrEqualTo(1500)
//                         ).sumOn("total"))
//                         .execute();
//                  FacetResult facetResult = r.get("product");
//                 assertThat(facetResult.getValues().size())
//                         .isEqualTo(2);
//                  assertThat(facetResult.getValues().stream().filter(x -> "milk".equals(x.getRange())).findFirst().get().getSum())
//                         .isEqualTo(12);
//                 assertThat(facetResult.getValues().stream().filter(x -> "iphone".equals(x.getRange())).findFirst().get().getSum())
//                         .isEqualTo(3333);
//                  facetResult = r.get("total");
//                 assertThat(facetResult.getValues().size())
//                         .isEqualTo(4);
//                  assertThat(facetResult.getValues().stream().filter(x -> "total < 100".equals(x.getRange())).findFirst().get().getSum())
//                         .isEqualTo(12);
//                 assertThat(facetResult.getValues().stream().filter(x -> "total >= 1500".equals(x.getRange())).findFirst().get().getSum())
//                         .isEqualTo(3333);
//             }
//         }
//     }
//      @Test
//     public void canCorrectlyAggregate_DateTimeDataType_WithRangeCounts() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             new ItemsOrders_All().execute(store);
//              try (IDocumentSession session = store.openSession()) {
//                 ItemsOrder item1 = new ItemsOrder();
//                 item1.setItems(Arrays.asList("first", "second"));
//                 item1.setAt(new Date());
//                  ItemsOrder item2 = new ItemsOrder();
//                 item2.setItems(Arrays.asList("first", "second"));
//                 item2.setAt(DateUtils.addDays(new Date(), -1));
//                  ItemsOrder item3 = new ItemsOrder();
//                 item3.setItems(Arrays.asList("first", "second"));
//                 item3.setAt(new Date());
//                  ItemsOrder item4 = new ItemsOrder();
//                 item4.setItems(Arrays.asList("first"));
//                 item4.setAt(new Date());
//                  session.store(item1);
//                 session.store(item2);
//                 session.store(item3);
//                 session.store(item4);
//                 session.saveChanges();
//             }
//              List<Object> items = Arrays.asList("second");
//              Date minValue = DateUtils.setYears(new Date(), 1980);
//              Date end0 = DateUtils.addDays(new Date(), -2);
//             Date end1 = DateUtils.addDays(new Date(), -1);
//             Date end2 = new Date();
//              waitForIndexing(store);
//              RangeBuilder<Date> builder = RangeBuilder.forPath("at");
//             try (IDocumentSession session = store.openSession()) {
//                 Map<String, FacetResult> r = session.query(ItemsOrder.class, ItemsOrders_All.class)
//                         .whereGreaterThanOrEqual("at", end0)
//                         .aggregateBy(f -> f.byRanges(
//                                 builder.isGreaterThanOrEqualTo(minValue), // all - 4
//                                 builder.isGreaterThanOrEqualTo(end0).isLessThan(end1), // 0
//                                 builder.isGreaterThanOrEqualTo(end1).isLessThan(end2))) // 1
//                         .execute();
//                  List<FacetValue> facetResults = r.get("at").getValues();
//                  assertThat(facetResults.get(0).getCount())
//                         .isEqualTo(4);
//                  assertThat(facetResults.get(1).getCount())
//                         .isEqualTo(1);
//                  assertThat(facetResults.get(2).getCount())
//                         .isEqualTo(3);
//             }
//         }
//     }
//     public static class ItemsOrder {
//         private List<String> items;
//         private Date at;
//          public List<String> getItems() {
//             return items;
//         }
//          public void setItems(List<String> items) {
//             this.items = items;
//         }
//          public Date getAt() {
//             return at;
//         }
//          public void setAt(Date at) {
//             this.at = at;
//         }
//     }
// }