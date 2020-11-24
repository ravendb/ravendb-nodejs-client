import { AbstractJavaScriptIndexCreationTask, IDocumentStore, RangeBuilder } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { Order } from "../../Assets/Faceted";
import { assertThat } from "../../Utils/AssertExtensions";

describe("RavenDB_12748", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canCorrectlyAggregate", async () => {
        await new Orders_All().execute(store);

        {
            const session = store.openSession();

            const order1 = new Order();
            order1.currency = "EUR";
            order1.product = "Milk";
            order1.quantity = 3;
            order1.total = 3;

            await session.store(order1);

            const order2 = new Order();
            order2.currency = "NIS";
            order2.product = "Milk";
            order2.quantity = 5;
            order2.total = 9;

            await session.store(order2);

            const order3 = new Order();
            order3.currency = "EUR";
            order3.product = "iPhone";
            order3.quantity = 7777;
            order3.total = 3333;

            await session.store(order3);
            await session.saveChanges();
        }

        await testContext.waitForIndexing(store);

        {
            const session = store.openSession();
            const r = await session.query<Order>({
                index: Orders_All,
                documentType: Order
            })
                .aggregateBy(f => f.byField("region"))
                .andAggregateBy(f => f.byField("product").sumOn("total").averageOn("total").sumOn("quantity"))
                .execute();

            let facetResult = r["region"];
            assertThat(facetResult.values)
                .hasSize(1);
            assertThat(facetResult.values[0].name)
                .isNull();
            assertThat(facetResult.values[0].count)
                .isEqualTo(3);

            facetResult = r["product"];
            const totalValues = facetResult.values.filter(x => x.name === "total");

            assertThat(totalValues)
                .hasSize(2);

            let milkValue = totalValues.find(x => x.range === "milk");
            let iphoneValue = totalValues.find(x => x.range === "iphone");

            assertThat(milkValue.count)
                .isEqualTo(2);
            assertThat(iphoneValue.count)
                .isEqualTo(1);
            assertThat(milkValue.sum)
                .isEqualTo(12);
            assertThat(iphoneValue.sum)
                .isEqualTo(3333);
            assertThat(milkValue.average)
                .isEqualTo(6);
            assertThat(iphoneValue.average)
                .isEqualTo(3333);
            assertThat(milkValue.max)
                .isNull();
            assertThat(iphoneValue.max)
                .isNull();
            assertThat(milkValue.min)
                .isNull();
            assertThat(iphoneValue.min)
                .isNull();

            const quantityValues = facetResult.values.filter(x => x.name === "quantity");

            milkValue = quantityValues.find(x => x.range === "milk");
            iphoneValue = quantityValues.find(x => x.range === "iphone");

            assertThat(milkValue.count)
                .isEqualTo(2);
            assertThat(iphoneValue.count)
                .isEqualTo(1);
            assertThat(milkValue.sum)
                .isEqualTo(8);
            assertThat(iphoneValue.sum)
                .isEqualTo(7777);
            assertThat(milkValue.average)
                .isNull();
            assertThat(iphoneValue.average)
                .isNull();
            assertThat(milkValue.max)
                .isNull();
            assertThat(iphoneValue.max)
                .isNull();
            assertThat(milkValue.min)
                .isNull();
            assertThat(iphoneValue.min)
                .isNull();
        }

        {
            const session = store.openSession();
            const r = await session.query<Order>({
                index: Orders_All,
                documentType: Order
            })
                .aggregateBy(f => f.byField("region"))
                .andAggregateBy(f => f.byField("product")
                    .sumOn("total", "T1")
                    .averageOn("total", "T1")
                    .sumOn("quantity", "Q1"))
                .execute();

            let facetResult = r["region"];
            assertThat(facetResult.values)
                .hasSize(1);
            assertThat(facetResult.values[0].name)
                .isNull();
            assertThat(facetResult.values[0].count)
                .isEqualTo(3);

            facetResult = r["product"];
            const totalValues = facetResult.values.filter(x => x.name === "T1");

            assertThat(totalValues)
                .hasSize(2);

            let milkValue = totalValues.find(x => x.range === "milk");
            let iphoneValue = totalValues.find(x => x.range === "iphone");

            assertThat(milkValue.count)
                .isEqualTo(2);
            assertThat(iphoneValue.count)
                .isEqualTo(1);
            assertThat(milkValue.sum)
                .isEqualTo(12);
            assertThat(iphoneValue.sum)
                .isEqualTo(3333);
            assertThat(milkValue.average)
                .isEqualTo(6);
            assertThat(iphoneValue.average)
                .isEqualTo(3333);
            assertThat(milkValue.max)
                .isNull();
            assertThat(iphoneValue.max)
                .isNull();
            assertThat(milkValue.min)
                .isNull();
            assertThat(iphoneValue.min)
                .isNull();

            const quantityValues = facetResult.values.filter(x => x.name === "Q1");

            milkValue = quantityValues.find(x => x.range === "milk");
            iphoneValue = quantityValues.find(x => x.range === "iphone");

            assertThat(milkValue.count)
                .isEqualTo(2);
            assertThat(iphoneValue.count)
                .isEqualTo(1);
            assertThat(milkValue.sum)
                .isEqualTo(8);
            assertThat(iphoneValue.sum)
                .isEqualTo(7777);
            assertThat(milkValue.average)
                .isNull();
            assertThat(iphoneValue.average)
                .isNull();
            assertThat(milkValue.max)
                .isNull();
            assertThat(iphoneValue.max)
                .isNull();
            assertThat(milkValue.min)
                .isNull();
            assertThat(iphoneValue.min)
                .isNull();
        }

        {
            const session = store.openSession();
            const r = await session.query<Order>({
                index: Orders_All,
                documentType: Order
            })
                .aggregateBy(f => f.byField("region"))
                .andAggregateBy(f => f.byField("product")
                    .sumOn("total", "T1")
                    .sumOn("total", "T2")
                    .averageOn("total", "T2")
                    .sumOn("quantity", "Q1"))
                .execute();

            let facetResult = r["region"];
            assertThat(facetResult.values)
                .hasSize(1);
            assertThat(facetResult.values[0].name)
                .isNull();
            assertThat(facetResult.values[0].count)
                .isEqualTo(3);

            facetResult = r["product"];
            let totalValues = facetResult.values.filter(x => x.name === "T1");

            assertThat(totalValues)
                .hasSize(2);

            let milkValue = totalValues.find(x => x.range === "milk");
            let iphoneValue = totalValues.find(x => x.range === "iphone");

            assertThat(milkValue.count)
                .isEqualTo(2);
            assertThat(iphoneValue.count)
                .isEqualTo(1);
            assertThat(milkValue.sum)
                .isEqualTo(12);
            assertThat(iphoneValue.sum)
                .isEqualTo(3333);
            assertThat(milkValue.average)
                .isNull();
            assertThat(iphoneValue.average)
                .isNull();
            assertThat(milkValue.max)
                .isNull();
            assertThat(iphoneValue.max)
                .isNull();
            assertThat(milkValue.min)
                .isNull();
            assertThat(iphoneValue.min)
                .isNull();

            totalValues = facetResult.values.filter(x => x.name === "T2");
            assertThat(totalValues)
                .hasSize(2);

            milkValue = totalValues.find(x => x.range === "milk");
            iphoneValue = totalValues.find(x => x.range === "iphone");

            assertThat(milkValue.count)
                .isEqualTo(2);
            assertThat(iphoneValue.count)
                .isEqualTo(1);
            assertThat(milkValue.sum)
                .isEqualTo(12);
            assertThat(iphoneValue.sum)
                .isEqualTo(3333);
            assertThat(milkValue.average)
                .isEqualTo(6);
            assertThat(iphoneValue.average)
                .isEqualTo(3333);
            assertThat(milkValue.max)
                .isNull();
            assertThat(iphoneValue.max)
                .isNull();
            assertThat(milkValue.min)
                .isNull();
            assertThat(iphoneValue.min)
                .isNull();

            const quantityValues = facetResult.values.filter(x => x.name === "Q1");

            milkValue = quantityValues.find(x => x.range === "milk");
            iphoneValue = quantityValues.find(x => x.range === "iphone");

            assertThat(milkValue.count)
                .isEqualTo(2);
            assertThat(iphoneValue.count)
                .isEqualTo(1);
            assertThat(milkValue.sum)
                .isEqualTo(8);
            assertThat(iphoneValue.sum)
                .isEqualTo(7777);
            assertThat(milkValue.average)
                .isNull();
            assertThat(iphoneValue.average)
                .isNull();
            assertThat(milkValue.max)
                .isNull();
            assertThat(iphoneValue.max)
                .isNull();
            assertThat(milkValue.min)
                .isNull();
            assertThat(iphoneValue.min)
                .isNull();
        }
    });

    it("canCorrectlyAggregate_Ranges", async () => {
        await new Orders_All().execute(store);

        {
            const session = store.openSession();
            const order1 = new Order();
            order1.currency = "EUR";
            order1.product = "Milk";
            order1.quantity = 3;
            order1.total = 3;

            await session.store(order1);

            const order2 = new Order();
            order2.currency = "NIS";
            order2.product = "Milk";
            order2.quantity = 5;
            order2.total = 9;

            await session.store(order2);

            const order3 = new Order();
            order3.currency = "EUR";
            order3.product = "iPhone";
            order3.quantity = 7777;
            order3.total = 3333;

            await session.store(order3);
            await session.saveChanges();
        }

        await testContext.waitForIndexing(store);

        {
            const session = store.openSession();
            const range = RangeBuilder.forPath<number>("total");

            const r = await session.query<Order>({
                documentType: Order,
                index: Orders_All
            })
                .aggregateBy(f => f.byRanges(
                    range.isLessThan(100),
                    range.isGreaterThanOrEqualTo(100).isLessThan(500),
                    range.isGreaterThanOrEqualTo(500).isLessThan(1500),
                    range.isGreaterThanOrEqualTo(1500)
                )
                    .sumOn("total")
                    .averageOn("total")
                    .sumOn("quantity"))
                .execute();

            const facetResult = r["total"];

            assertThat(facetResult.values)
                .hasSize(8);

            let range1 = facetResult.values.find(x => x.range === "total < 100" && x.name === "total");
            let range2 = facetResult.values.find(x => x.range === "total >= 1500" && x.name === "total");

            assertThat(range1.count)
                .isEqualTo(2);
            assertThat(range2.count)
                .isEqualTo(1);
            assertThat(range1.sum)
                .isEqualTo(12);
            assertThat(range2.sum)
                .isEqualTo(3333);
            assertThat(range1.average)
                .isEqualTo(6);
            assertThat(range2.average)
                .isEqualTo(3333);
            assertThat(range1.max)
                .isNull();
            assertThat(range2.max)
                .isNull();
            assertThat(range1.min)
                .isNull();
            assertThat(range2.min)
                .isNull();

            range1 = facetResult.values.find(x => x.range === "total < 100" && x.name === "quantity");
            range2 = facetResult.values.find(x => x.range === "total >= 1500" && x.name === "quantity");

            assertThat(range1.count)
                .isEqualTo(2);
            assertThat(range2.count)
                .isEqualTo(1);
            assertThat(range1.sum)
                .isEqualTo(8);
            assertThat(range2.sum)
                .isEqualTo(7777);
            assertThat(range1.average)
                .isNull();
            assertThat(range2.average)
                .isNull();
            assertThat(range1.max)
                .isNull();
            assertThat(range2.max)
                .isNull();
            assertThat(range1.min)
                .isNull();
            assertThat(range2.min)
                .isNull();
        }

        {
            const session = store.openSession();
            const range = RangeBuilder.forPath<number>("total");

            const r = await session.query<Order>({
                documentType: Order,
                index: Orders_All
            })
                .aggregateBy(f => f.byRanges(
                    range.isLessThan(100),
                    range.isGreaterThanOrEqualTo(100).isLessThan(500),
                    range.isGreaterThanOrEqualTo(500).isLessThan(1500),
                    range.isGreaterThanOrEqualTo(1500)
                )
                    .sumOn("total", "T1")
                    .averageOn("total", "T1")
                    .sumOn("quantity", "Q1"))
                .execute();

            const facetResult = r["total"];

            assertThat(facetResult.values)
                .hasSize(8);

            let range1 = facetResult.values.find(x => x.range === "total < 100" && x.name === "T1");
            let range2 = facetResult.values.find(x => x.range === "total >= 1500" && x.name === "T1");

            assertThat(range1.count)
                .isEqualTo(2);
            assertThat(range2.count)
                .isEqualTo(1);
            assertThat(range1.sum)
                .isEqualTo(12);
            assertThat(range2.sum)
                .isEqualTo(3333);
            assertThat(range1.average)
                .isEqualTo(6);
            assertThat(range2.average)
                .isEqualTo(3333);
            assertThat(range1.max)
                .isNull();
            assertThat(range2.max)
                .isNull();
            assertThat(range1.min)
                .isNull();
            assertThat(range2.min)
                .isNull();

            range1 = facetResult.values.find(x => x.range === "total < 100" && x.name === "Q1");
            range2 = facetResult.values.find(x => x.range === "total >= 1500" && x.name === "Q1");

            assertThat(range1.count)
                .isEqualTo(2);
            assertThat(range2.count)
                .isEqualTo(1);
            assertThat(range1.sum)
                .isEqualTo(8);
            assertThat(range2.sum)
                .isEqualTo(7777);
            assertThat(range1.average)
                .isNull();
            assertThat(range2.average)
                .isNull();
            assertThat(range1.max)
                .isNull();
            assertThat(range2.max)
                .isNull();
            assertThat(range1.min)
                .isNull();
            assertThat(range2.min)
                .isNull();
        }

        {
            const session = store.openSession();
            const range = RangeBuilder.forPath<number>("total");

            const r = await session.query<Order>({
                documentType: Order,
                index: Orders_All
            })
                .aggregateBy(f => f.byRanges(
                    range.isLessThan(100),
                    range.isGreaterThanOrEqualTo(100).isLessThan(500),
                    range.isGreaterThanOrEqualTo(500).isLessThan(1500),
                    range.isGreaterThanOrEqualTo(1500)
                )
                    .sumOn("total", "T1")
                    .sumOn("total", "T2")
                    .averageOn("total", "T2")
                    .sumOn("quantity", "Q1"))
                .execute();

            const facetResult = r["total"];
            assertThat(facetResult.values)
                .hasSize(12);

            let range1 = facetResult.values.find(x => x.range === "total < 100" && x.name === "T1");
            let range2 = facetResult.values.find(x => x.range === "total >= 1500" && x.name === "T1");

            assertThat(range1.count)
                .isEqualTo(2);
            assertThat(range2.count)
                .isEqualTo(1);
            assertThat(range1.sum)
                .isEqualTo(12);
            assertThat(range2.sum)
                .isEqualTo(3333);
            assertThat(range1.average)
                .isNull();
            assertThat(range2.average)
                .isNull();
            assertThat(range1.max)
                .isNull();
            assertThat(range2.max)
                .isNull();
            assertThat(range1.min)
                .isNull();
            assertThat(range2.min)
                .isNull();

            range1 = facetResult.values.find(x => x.range === "total < 100" && x.name === "T2");
            range2 = facetResult.values.find(x => x.range === "total >= 1500" && x.name === "T2");

            assertThat(range1.count)
                .isEqualTo(2);
            assertThat(range2.count)
                .isEqualTo(1);
            assertThat(range1.sum)
                .isEqualTo(12);
            assertThat(range2.sum)
                .isEqualTo(3333);
            assertThat(range1.average)
                .isEqualTo(6);
            assertThat(range2.average)
                .isEqualTo(3333);
            assertThat(range1.max)
                .isNull();
            assertThat(range2.max)
                .isNull();
            assertThat(range1.min)
                .isNull();
            assertThat(range2.min)
                .isNull();

            range1 = facetResult.values.find(x => x.range === "total < 100" && x.name === "Q1");
            range2 = facetResult.values.find(x => x.range === "total >= 1500" && x.name === "Q1");

            assertThat(range1.count)
                .isEqualTo(2);
            assertThat(range2.count)
                .isEqualTo(1);
            assertThat(range1.sum)
                .isEqualTo(8);
            assertThat(range2.sum)
                .isEqualTo(7777);
            assertThat(range1.average)
                .isNull();
            assertThat(range2.average)
                .isNull();
            assertThat(range1.max)
                .isNull();
            assertThat(range2.max)
                .isNull();
            assertThat(range1.min)
                .isNull();
            assertThat(range2.max)
                .isNull();
        }
    });
});


class Orders_All extends AbstractJavaScriptIndexCreationTask<Order> {
    public constructor() {
        super();

        this.map(Order, order => {
            return {
                currency: order.currency,
                product: order.product,
                total: order.total,
                quantity: order.quantity,
                region: order.region,
                at: order.at,
                tax: order.tax
            }
        });
    }
}