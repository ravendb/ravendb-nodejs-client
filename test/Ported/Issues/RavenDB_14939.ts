import { AbstractJavaScriptIndexCreationTask, IDocumentStore, ResetIndexOperation } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions";
import { AnalyzerDefinition } from "../../../src/Documents/Indexes/Analysis/AnalyzerDefinition";
import { PutAnalyzersOperation } from "../../../src/Documents/Operations/Analyzers/PutAnalyzersOperation";
import { RavenDB_16328_Analyzer } from "./RavenDB_16328_Analyzers";
import { DeleteAnalyzerOperation } from "../../../src/Documents/Operations/Analyzers/DeleteAnalyzerOperation";

describe("RavenDB_14939Test", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canUseCustomAnalyzerWithOperations", async function () {
        const analyzerName = store.database;

        await assertThrows(() => store.executeIndex(new MyIndex(analyzerName)), err => {
            assertThat(err.name)
                .isEqualTo("IndexCompilationException");
            assertThat(err.message)
                .contains("Cannot find analyzer type '" + analyzerName + "' for field: name");
        });

        const analyzerDefinition: AnalyzerDefinition = {
            name: analyzerName,
            code: getAnalyzer(analyzerName)
        };

        await store.maintenance.send(new PutAnalyzersOperation(analyzerDefinition));

        await store.executeIndex(new MyIndex(analyzerName));

        await fill(store);

        await testContext.waitForIndexing(store);

        await assertCount(store);

        await store.maintenance.send(new DeleteAnalyzerOperation(analyzerName));

        await store.maintenance.send(new ResetIndexOperation(new MyIndex(analyzerName).getIndexName()));

        const errors = await testContext.indexes.waitForIndexingErrors(store, 10_000);
        assertThat(errors)
            .hasSize(1);
        assertThat(errors[0].errors)
            .hasSize(1);
        assertThat(errors[0].errors[0].error)
            .contains("Cannot find analyzer type '" + analyzerName + "' for field: name");
    });
});

async function fill(store: IDocumentStore) {
    const session = store.openSession();

    const c1 = new Customer();
    c1.name = "Rogério";
    await session.store(c1);

    const c2 = new Customer();
    c2.name = "Rogerio";
    await session.store(c2);

    const c3 = new Customer();
    c3.name = "Paulo Rogerio";
    await session.store(c3);

    const c4 = new Customer();
    c4.name = "Paulo Rogério";
    await session.store(c4);

    await session.saveChanges();
}

async function assertCount(store: IDocumentStore) {
    await testContext.waitForIndexing(store);

    {
        const session = store.openSession();
        const results = session.query(Customer, MyIndex)
            .noCaching()
            .search("name", "Rogério*");

        assertThat(await results.count())
            .isEqualTo(4);
    }
}

function getAnalyzer(analyzerName: string) {
    return RavenDB_16328_Analyzer.replace(/MyAnalyzer/g, analyzerName);
}

class Customer {
    public id: string;
    public name: string;
}

class MyIndex extends AbstractJavaScriptIndexCreationTask<Customer> {
    constructor(analyzerName = "MyAnalyzer") {
        super();

        this.map(Customer, c => ({
            name: c.name
        }));

        this.index("name", "Search");
        this.analyze("name", analyzerName);
    }
}
