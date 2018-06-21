import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../../../../Utils/TestUtil";

import {
    IDocumentStore,
    GroupBy,
} from "../../../../../src";
import { Order, OrderLine, Address } from "../../../../Assets/Entities";

describe("RavenDB-8761", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
        await putDocs(store);
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("can group by array values", async () => {
        {
            const session = store.openSession();

            const productCounts1 = await session.advanced
                .rawQuery<ProductCount>(`from Orders 
                      group by lines[].product
                      order by count()
                      select key() as productName, count() as count`, ProductCount)
                .waitForNonStaleResults()
                .all();

            const productCounts2 = await session.advanced
                .documentQuery<Order>(Order)
                .groupBy("lines[].product")
                .selectKey(null, "productName")
                .selectCount()
                .ofType<ProductCount>(ProductCount)
                .all();

            for (const products of [productCounts1, productCounts2]) {
                assert.equal(products.length, 2);

                assert.equal(products[0].productName, "products/1");
                assert.equal(products[0].count, 1);

                assert.equal(products[1].productName, "products/2");
                assert.equal(products[1].count, 2);
            }
        }

        {
            const session = store.openSession();

            function assertQueryResults(products: any[]) {
                assert.equal(products.length, 2);

                assert.equal(products[0].productName, "products/1");
                assert.equal(products[0].count, 1);
                assert.equal(products[0].country, "USA");

                assert.equal(products[1].productName, "products/2");
                assert.equal(products[1].count, 2);
                assert.equal(products[1].country, "USA");
            }

            const productCounts1 = await session.advanced
                .rawQuery(`from Orders
                        group by lines[].product, shipTo.country
                        order by count() 
                        select 
                            lines[].product as productName, 
                            shipTo.country as country, 
                            count() as count`, ProductCount)
                .all();

            assertQueryResults(productCounts1);

            const productCounts2 = await session.advanced.documentQuery(Order)
                .groupBy("lines[].product", "shipTo.country")
                .selectKey("lines[].product", "productName")
                .selectKey("shipTo.country", "country")
                .selectCount()
                .ofType(ProductCount)
                .all();

            assertQueryResults(productCounts2);
        }
        {
            const session = store.openSession();

            function assertQueryResults(products: any[]) {
                assert.equal(products.length, 3);

                assert.equal(products[0].productName, "products/1");
                assert.equal(products[0].count, 1);
                assert.equal(products[0].quantity, 1);

                assert.equal(products[1].productName, "products/2");
                assert.equal(products[1].count, 1);
                assert.equal(products[1].quantity, 2);

                assert.equal(products[2].productName, "products/2");
                assert.equal(products[2].count, 1);
                assert.equal(products[2].quantity, 3);
            }

            const productCounts1 = await session.advanced
                .rawQuery(`from Orders
                         group by lines[].product, lines[].quantity
                         order by lines[].quantity
                         select lines[].product as productName, lines[].quantity as quantity, count() as count`, 
                ProductCount)
                        .all();

            assertQueryResults(productCounts1);

            const productCounts2 = await session.advanced.documentQuery(Order)
                .groupBy("lines[].product", "lines[].quantity")
                .selectKey("lines[].product", "productName")
                .selectKey("lines[].quantity", "quantity")
                .selectCount()
                .ofType(ProductCount)
                .all();

            assertQueryResults(productCounts2);
        }
    });

    it("can group by array content", async () => {
        {
            const session = store.openSession();
            const order = Object.assign(new Order(), {
                lines: [
                    Object.assign(new OrderLine(), {
                        product: "products/1",
                        quantity: 1
                    }),
                    Object.assign(new OrderLine(), {
                        product: "products/2",
                        quantity: 2
                    })
                ],
                shipTo: Object.assign(new Address(), {
                    country: "USA"
                })
            });

            await session.store(order);
            await session.saveChanges();
        }

        {
            const session = store.openSession();

            function assertQueryResults(products: any[]) {
                assert.equal(products.length, 2);

                assert.deepEqual(products[0].products, ["products/2"]);
                assert.equal(products[0].count, 1);

                assert.deepEqual(products[1].products, ["products/1", "products/2"]);
                assert.equal(products[1].count, 2);
            }

            const productCounts1 = await session.advanced
                .rawQuery(`from Orders 
                 group by array(lines[].product)
                 order by count()
                 select key() as products, count() as count`, ProductCount)
                .waitForNonStaleResults()
                .all();
            
            assertQueryResults(productCounts1);

            const productCounts2 = await session.advanced
                .documentQuery(Order)
                .groupBy(GroupBy.array("lines[].product"))
                .selectKey(null, "products")
                .selectCount()
                .orderBy("count")
                .ofType<ProductCount>(ProductCount)
                .all();

            assertQueryResults(productCounts2);
        }

        {
            const session = store.openSession();

            function assertQueryResults(products: any[]) {
                assert.equal(products.length, 2);

                assert.deepEqual(products[0].products, ["products/2"]);
                assert.equal(products[0].count, 1);

                assert.deepEqual(products[1].products, ["products/1", "products/2"]);
                assert.equal(products[1].count, 2);
            }

            const productCounts1 = await session.advanced
                .rawQuery(`from Orders
                         group by array(lines[].product), shipTo.country
                         order by count()
                         select 
                            lines[].product as products, 
                            shipTo.country as country, count() as count`, ProductCount)
                .waitForNonStaleResults()
                .all();
            
            assertQueryResults(productCounts1);

            const productCounts2 = await session
                .advanced
                .documentQuery(Order)
                .groupBy(GroupBy.array("lines[].product"), GroupBy.field("shipTo.country"))
                .selectKey("lines[].product", "products")
                .selectCount()
                .orderBy("count")
                .ofType<ProductCount>(ProductCount)
                .all();

            assertQueryResults(productCounts2);
        }

        {
            const session = store.openSession();
            const productCounts1 = await session.advanced
                .rawQuery(`from Orders
                         group by array(lines[].product), array(lines[].quantity)
                         order by count() 
                         select 
                            lines[].product as products, 
                            lines[].quantity as quantities, 
                            count() as count`, ProductCount)
                .waitForNonStaleResults()
                .all();

            assertQueryResults(productCounts1);

            const productCounts2 = await session
                .advanced
                .documentQuery(Order)
                .groupBy(GroupBy.array("lines[].product"), GroupBy.array("lines[].quantity"))
                .selectKey("lines[].product", "products")
                .selectKey("lines[].quantity", "quantities")
                .selectCount()
                .orderBy("count")
                .ofType(ProductCount)
                .all();

            assertQueryResults(productCounts2);

            function assertQueryResults(products: any[]) {

                    assert.equal(products.length, 2);

                    assert.deepEqual(products[0].products, ["products/2"])
                    assert.equal(products[0].count, 1)
                    assert.deepEqual(products[0].quantities, [3]);

                    assert.deepEqual(products[1].products, ["products/1", "products/2"]);
                    assert.equal(products[1].count, 2);
                    assert.deepEqual(products[1].quantities, [ 1, 2 ]);
            }


        }
    });
});

class ProductCount {
    public productName: string;
    public count: number;
    public country: string;
    public quantity: number;
    public products: string[];
    public quantities: number[];
}

async function putDocs(store: IDocumentStore) {
    const session = store.openSession();
    const order1 = Object.assign(new Order(), {
        lines: [
            Object.assign(new OrderLine(), {
                product: "products/1",
                quantity: 1
            }),
            Object.assign(new OrderLine(), {
                product: "products/2",
                quantity: 2
            })
        ],
        shipTo: Object.assign(new Address(), {
            country: "USA"
        })
    });

    await session.store(order1);

    const order2 = Object.assign(new Order(), {
        lines: [
            Object.assign(new OrderLine(), {
                product: "products/2",
                quantity: 3,
            })
        ],
        shipTo: Object.assign(new Address(), {
            country: "USA"
        })
    });
    await session.store(order2);

    await session.saveChanges();
}
