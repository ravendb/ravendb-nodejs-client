import assert from "node:assert";
import {
    AbstractCsharpIndexCreationTask,
    CONSTANTS,
    GetDocumentsCommand,
    IDocumentStore,
    IMetadataDictionary
} from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

const { CHANGE_VECTOR, COLLECTION, ID, LAST_MODIFIED, RAVEN_JS_TYPE } = CONSTANTS.Documents.Metadata;

describe("RavenDB_4041", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    async function storeCustomers(count: number, id?: string) {
        await new Customers_ByName().execute(store);

        const session = store.openSession();
        for (let i = 0; i < count; i++) {
            await session.store(Object.assign(new Customer(), { name: "John", address: "Tel Aviv" }), id);
        }
        await session.saveChanges();

        await testContext.waitForIndexing(store);
    }

    function assertCustomer(customer: Customer) {
        assertThat(customer).isNotNull();
        assertThat(customer.id).isNotNull();
        assert.strictEqual(customer.name, "John");
        assert.strictEqual(customer.address, "Tel Aviv");
    }

    function assertSessionMetadata(metadata: IMetadataDictionary) {
        assertThat(metadata[CHANGE_VECTOR]).isNotNull();
        assertThat(metadata[RAVEN_JS_TYPE]).isNotNull();
        assertThat(metadata[COLLECTION]).isNotNull();
        assertThat(metadata[LAST_MODIFIED]).isNotNull();
    }

    async function assertGetReturnsMetadata(id: string) {
        const command = new GetDocumentsCommand({ id, conventions: store.conventions });
        await store.getRequestExecutor().execute(command);
        const customer = command.result.results[0];

        assertThat(customer).isNotNull();

        const metadata = customer["@metadata"];
        assertThat(metadata[ID]).isNotNull();

        assert.strictEqual(customer["name"], "John");
        assert.strictEqual(customer["address"], "Tel Aviv");

        assertThat(metadata[CHANGE_VECTOR]).isNotNull();
        assertThat(metadata[LAST_MODIFIED]).isNotNull();

        assert.ok(RAVEN_JS_TYPE in metadata);
        assert.ok(COLLECTION in metadata);
        assert.ok(LAST_MODIFIED in metadata);
    }

    it("returns metadata", async () => {
        await storeCustomers(1);

        const session = store.openSession();
        const customer = await session.query(Customer).firstOrNull();
        assertCustomer(customer);

        assertSessionMetadata(session.advanced.getMetadataFor(customer));
    });

    it("load returns metadata", async () => {
        await storeCustomers(1);

        const session = store.openSession();
        const customer = await session.load("customers/1-A", Customer);
        assertCustomer(customer);

        assertSessionMetadata(session.advanced.getMetadataFor(customer));
    });

    it("load with big key returns metadata", async () => {
        const id = "a".repeat(130);
        await storeCustomers(1, id);

        await assertGetReturnsMetadata(id);
    });

    it("multi load returns metadata", async () => {
        await storeCustomers(2);

        const session = store.openSession();
        const customers = await session.load(["customers/1-A", "customers/2-A"], Customer);

        for (const customer of Object.values(customers)) {
            assertCustomer(customer);

            assertSessionMetadata(session.advanced.getMetadataFor(customer));
        }
    });

    it("load lazily returns metadata", async () => {
        await storeCustomers(1);

        const session = store.openSession();
        const customerLazy = session.advanced.lazily.load("customers/1-A", Customer);
        const customer = await customerLazy.getValue();
        assertCustomer(customer);

        assertSessionMetadata(session.advanced.getMetadataFor(customer));
    });

    it("get returns metadata", async () => {
        await storeCustomers(1);

        await assertGetReturnsMetadata("customers/1-A");
    });
});

class Customer {
    public id: string;
    public name: string;
    public address: string;
}

class Customers_ByName extends AbstractCsharpIndexCreationTask {
    public constructor() {
        super();

        this.map = "from customer in docs.Customers select new { customer.name }";
    }
}
