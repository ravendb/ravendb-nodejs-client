import { IDocumentQuery } from "../../../src/Documents/Session/IDocumentQuery";
import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import {
    IDocumentStore,
    AbstractIndexCreationTask,
    IDocumentSession,
} from "../../../src";

describe("Issue RavenDB-903", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("test1", async () => {
        await doTest(store, session => {
            return session.advanced.documentQuery<Product>({
                documentType: Product,
                indexName: TestIndex.name
            })
                .search("description", "Hello")
                .intersect()
                .whereEquals("name", "Bar");
        });
    });

    it("test2", async () => {
        await doTest(store, session => {
            return session.advanced.documentQuery<Product>({
                documentType: Product,
                indexName: TestIndex.name
            })
                .whereEquals("name", "Bar")
                .intersect()
                .search("description", "Hello");
        });
    });

    async function doTest(
        docStore: IDocumentStore,
        queryFunction: (session: IDocumentSession) => IDocumentQuery<Product>) {
        await docStore.executeIndex(new TestIndex());

        {
            const session = docStore.openSession();
            const product1 = new Product();
            product1.name = "Foo";
            product1.description = "Hello World";

            const product2 = new Product();
            product2.name = "Bar";
            product2.description = "Hello World";

            const product3 = new Product();
            product3.name = "Bar";
            product3.description = "Goodbye World";

            await session.store(product1);
            await session.store(product2);
            await session.store(product3);
            await session.saveChanges();
        }

        await testContext.waitForIndexing(docStore);

        {
            const session = docStore.openSession();
            const products = await queryFunction(session).all();
            assert.strictEqual(products.length, 1);

        }
    }
});

export class Product {
    public name: string;
    public description: string;
}

class TestIndex extends AbstractIndexCreationTask {
    public constructor() {
        super();

        this.map = "from product in docs.Products select new { product.name, product.description }";

        this.index("description", "Search");
    }
}
