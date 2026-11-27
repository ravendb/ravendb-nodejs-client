import { AbstractJavaScriptIndexCreationTask, IDocumentStore } from "../../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../../Utils/TestUtil.js";
import { assertThat } from "../../../Utils/AssertExtensions.js";

class Foo {
    public bar: string;
}

class FooBarIndex extends AbstractJavaScriptIndexCreationTask<Foo, Pick<Foo, "bar">> {
    public constructor() {
        super();

        this.map(Foo, foo => ({ bar: foo.bar }));

        this.analyze("bar", "Lucene.Net.Analysis.Standard.StandardAnalyzer");
    }
}

describe("AnalyzersThatRemovesStarShouldNotCutTheLastChar", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("can do prefix query on analyzed fields", async () => {
        await new FooBarIndex().execute(store);

        const session = store.openSession();
        await session.store(Object.assign(new Foo(), { bar: "Shalom" }));
        await session.store(Object.assign(new Foo(), { bar: "Salam" }));
        await session.saveChanges();

        const res = await session.query(Foo, FooBarIndex)
            .waitForNonStaleResults()
            .whereStartsWith("bar", "Sh")
            .single();

        assertThat(res.bar)
            .isEqualTo("Shalom");
    });
});
