import { AbstractJavaScriptIndexCreationTask, IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

declare function load(id: string, collection: string): any;

interface CompanyOrders {
    company: string;
    companyDoc: { name: string; id?: string; companyId?: string };
    count: number;
}

class Orders_ByCompany extends AbstractJavaScriptIndexCreationTask<any, CompanyOrders> {
    public constructor() {
        super();

        this.map("Orders", o => ({ company: o.company, companyDoc: load(o.company, "Companies"), count: 1 }));

        this.reduce(results => results.groupBy(x => x.company).aggregate(g => ({
            company: g.key,
            companyDoc: g.values[0].companyDoc,
            count: g.values.length
        })));
    }
}

describe("FindIdentityPropertyNameFromCollectionNameTest", function () {

    let store: IDocumentStore;

    afterEach(async () => {
        testContext.customizeStore = null;
        await disposeTestDocumentStore(store);
    });

    it("sets the identity property on nested documents of results without an id", async () => {
        testContext.customizeStore = async s => {
            s.conventions.findIdentityPropertyNameFromCollectionName = collectionName =>
                collectionName === "Companies" ? "companyId" : "id";
        };
        store = await testContext.getDocumentStore();

        const result = await queryMapReduceResult();

        assertThat(result.companyDoc.name).isEqualTo("Acme");
        assertThat(result.companyDoc.companyId).isEqualTo("companies/1");
        assertThat(result.companyDoc.id).isUndefined();
    });

    it("leaves nested documents untouched when the convention is not set", async () => {
        store = await testContext.getDocumentStore();

        const result = await queryMapReduceResult();

        assertThat(result.companyDoc.name).isEqualTo("Acme");
        assertThat(result.companyDoc.companyId).isUndefined();
        assertThat(result.companyDoc.id).isUndefined();
    });

    async function queryMapReduceResult(): Promise<CompanyOrders> {
        const session = store.openSession();
        await session.store({ name: "Acme", "@metadata": { "@collection": "Companies" } }, "companies/1");
        await session.store({ company: "companies/1", "@metadata": { "@collection": "Orders" } }, "orders/1");
        await session.saveChanges();

        await new Orders_ByCompany().execute(store);
        await testContext.waitForIndexing(store);

        const results = await store.openSession().query<CompanyOrders>({ indexName: new Orders_ByCompany().getIndexName() }).all();
        assertThat(results).hasSize(1);
        return results[0];
    }
});
