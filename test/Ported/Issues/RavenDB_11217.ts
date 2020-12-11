import { IDocumentStore } from "../../../src/Documents/IDocumentStore";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { Product, Supplier } from "../../Assets/Orders";
import { SessionOptions } from "../../../src/Documents/Session/SessionOptions";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions";
import { QueryStatistics } from "../../../src/Documents/Session/QueryStatistics";

describe("RavenDB_11217Test", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("sessionWideNoTrackingShouldWork", async () => {
        {
            const session = store.openSession();
            const supplier = new Supplier();
            supplier.name = "Supplier1";

            await session.store(supplier);

            const product = Object.assign(new Product(), {
                name: "Product1",
                supplier: supplier.id
            });

            await session.store(product);
            await session.saveChanges();
        }

        const noTrackingOptions: SessionOptions = {
            noTracking: true
        };

        {
            const session = store.openSession(noTrackingOptions);
            const supplier = new Supplier();
            supplier.name = "Supplier2";

            await assertThrows(() => session.store(supplier), err => {
                assertThat(err.name)
                    .isEqualTo("InvalidOperationException");
            });
        }

        {
            const session = store.openSession(noTrackingOptions);
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(0);

            const product1 = await session.load<Product>("products/1-A", {
                includes: b => b.includeDocuments("supplier"),
                documentType: Product
            });

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            assertThat(product1)
                .isNotNull();
            assertThat(product1.name)
                .isEqualTo("Product1");

            assertThat(session.advanced.isLoaded(product1.id))
                .isFalse();
            assertThat(session.advanced.isLoaded(product1.supplier))
                .isFalse();

            const supplier = await session.load<Supplier>(product1.supplier, Supplier);
            assertThat(supplier)
                .isNotNull();
            assertThat(supplier.name)
                .isEqualTo("Supplier1");
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(2);
            assertThat(session.advanced.isLoaded(supplier.id))
                .isFalse();

            const product2 = await session.load<Product>("products/1-A", {
                documentType: Product,
                includes: b=> b.includeDocuments("supplier")
            });
            assertThat(product1)
                .isNotSameAs(product2);
        }

        {
            const session = store.openSession(noTrackingOptions);
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(0);

            const product1 = (await session.advanced.loadStartingWith<Product>("products/", { documentType: Product }))[0];

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            assertThat(product1)
                .isNotNull();
            assertThat(product1.name)
                .isEqualTo("Product1");
            assertThat(session.advanced.isLoaded(product1.id))
                .isFalse();
            assertThat(session.advanced.isLoaded(product1.supplier))
                .isFalse();

            const supplier = (await session.advanced.loadStartingWith<Supplier>(product1.supplier, { documentType: Supplier }))[0];

            assertThat(supplier)
                .isNotNull();
            assertThat(supplier.name)
                .isEqualTo("Supplier1");
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(2);
            assertThat(session.advanced.isLoaded(supplier.id))
                .isFalse();

            const product2 = (await session.advanced.loadStartingWith<Product>("products/", { documentType: Product }))[0];
            assertThat(product1)
                .isNotSameAs(product2);
        }

        {
            const session = store.openSession(noTrackingOptions);

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(0);

            let products = await session.query(Product)
                .include("supplier")
                .all();

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);
            assertThat(products)
                .hasSize(1);

            const product1 = products[0];
            assertThat(product1)
                .isNotNull();
            assertThat(session.advanced.isLoaded(product1.id))
                .isFalse();
            assertThat(session.advanced.isLoaded(product1.supplier))
                .isFalse();

            const supplier = await session.load<Supplier>(product1.supplier, Supplier);
            assertThat(supplier)
                .isNotNull();
            assertThat(supplier.name)
                .isEqualTo("Supplier1");
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(2);
            assertThat(session.advanced.isLoaded(supplier.id))
                .isFalse();

            products = await session
                .query(Product)
                .include("supplier")
                .all();

            assertThat(products)
                .hasSize(1);

            const product2 = products[0];
            assertThat(product1)
                .isNotSameAs(product2);
        }

        {
            const session = store.openSession();
            session.countersFor("products/1-A")
                .increment("c1");
            await session.saveChanges();
        }

        {
            const session = store.openSession(noTrackingOptions);
            const product1 = await session.load<Product>("products/1-A", Product);
            const counters = await session.countersFor(product1.id);

            counters.get("c1");

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(2);

            counters.get("c1");

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(3);

            const val1 = await counters.getAll();

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(4);

            const val2 = await counters.getAll();

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(5);

            assertThat(val1)
                .isNotSameAs(val2);
        }
    });

    it("sessionWideNoCachingShouldWork", async () => {
        {
            const session = store.openSession();
            let stats: QueryStatistics;
            await session.query(Product)
                .statistics(s => stats = s)
                .whereEquals("name", "HR")
                .all();

            assertThat(stats.durationInMs)
                .isGreaterThan(-0.01);

            await session.query(Product)
                .statistics(s => stats = s)
                .whereEquals("name", "HR")
                .all();

            assertThat(stats.durationInMs)
                .isEqualTo(-1); // from cache
        }

        const noCacheOptions: SessionOptions = {
            noCaching: true
        };

        {
            const session = store.openSession(noCacheOptions);
            let stats: QueryStatistics;

            await session.query(Product)
                .statistics(s => stats = s)
                .whereEquals("name", "HR")
                .all();

            assertThat(stats.durationInMs)
                .isGreaterThan(-0.01);

            await session.query(Product)
                .statistics(s => stats = s)
                .whereEquals("name", "HR")
                .all();

            assertThat(stats.durationInMs)
                .isGreaterThan(-1);
        }
    })
});
