import { AbstractJavaScriptIndexCreationTask, IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

describe("RavenDB_26921Test", function () {
    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    const queries = ["qui*", "*ick", "*ic*"];

    for (const query of queries) {
        it("prefixSuffixSearchOperatorStaticField_" + query, async () => {
            await testExecutor(MyDocsStaticField, query);
        });

        it("prefixSuffixSearchOperatorDynamicField_" + query, async () => {
            await testExecutor(MyDocsDynamicField, query);
        });
    }

    async function testExecutor(indexType: new () => AbstractJavaScriptIndexCreationTask<MyDoc, any>, query: string) {
        await spawn(indexType);

        const session = store.openSession();
        const results = await session.query(MyDoc, indexType)
            .search("customFieldName", query)
            .all();

        assertThat(results)
            .hasSize(1);
    }

    async function spawn(indexType: new () => AbstractJavaScriptIndexCreationTask<MyDoc, any>) {
        {
            const session = store.openSession();
            await session.store(Object.assign(new MyDoc(), { name: "The quick brown fox jumps over the lazy dog" }));
            await session.saveChanges();
        }

        await new indexType().execute(store);
        await testContext.waitForIndexing(store);
    }
});

class MyDoc {
    public name: string;
    public customFieldName: string;
}

class MyDocsStaticField extends AbstractJavaScriptIndexCreationTask<MyDoc, { customFieldName: string }> {
    public constructor() {
        super();

        this.map(MyDoc, doc => {
            return {
                customFieldName: doc.name
            }
        });

        this.index("customFieldName", "Search");
        this.store("customFieldName", "No");
    }
}

class MyDocsDynamicField extends AbstractJavaScriptIndexCreationTask<MyDoc> {
    public constructor() {
        super();

        const { createField } = this.mapUtils();

        this.map(MyDoc, doc => {
            // noinspection JSVoidFunctionReturnValueUsed
            return {
                _: createField("customFieldName", doc.name, {
                    indexing: "Search",
                    storage: false,
                    termVector: null
                })
            }
        });
    }
}
