import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class Foo {
    public id: string;
    public name: string = null;
    public number: number = null;
    public date: Date = null;
}

function foo(fields: Partial<Foo>): Foo {
    return Object.assign(new Foo(), fields);
}

describe("InQuery", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("querying using in should yield distinct results", async () => {
        const session = store.openSession();
        await session.store(foo({ name: "Bar" }), "Foos/1");
        await session.saveChanges();

        await session.query(Foo)
            .whereIn("id", ["Foos/1", "Foos/1", "Foos/1", "Foos/1"])
            .single();
    });

    it("can query null using in query", async () => {
        const session = store.openSession();
        await session.store(foo({ name: null, number: null }));
        await session.store(foo({ name: "", number: 1 }));
        await session.saveChanges();

        let resultNulls = await session.advanced.rawQuery("from Foos where name in (0, null)", Foo)
            .waitForNonStaleResults()
            .noTracking()
            .all();
        assertThat(resultNulls).hasSize(1);

        resultNulls = await session.advanced.rawQuery("from Foos where name in (null, 0)", Foo)
            .waitForNonStaleResults()
            .noTracking()
            .all();
        assertThat(resultNulls).hasSize(1);

        resultNulls = await session.advanced.documentQuery(Foo)
            .whereIn("name", ["0", null])
            .noTracking()
            .waitForNonStaleResults()
            .all();
        assertThat(resultNulls).hasSize(1);

        resultNulls = await session.advanced.documentQuery(Foo)
            .whereIn("name", [null, "0"])
            .noTracking()
            .waitForNonStaleResults()
            .all();
        assertThat(resultNulls).hasSize(1);

        resultNulls = await session.advanced.documentQuery(Foo)
            .whereIn("number", [0, null])
            .noTracking()
            .waitForNonStaleResults()
            .all();
        assertThat(resultNulls).hasSize(1);

        resultNulls = await session.advanced.documentQuery(Foo)
            .whereIn("number", [null, 0])
            .noTracking()
            .waitForNonStaleResults()
            .all();
        assertThat(resultNulls).hasSize(1);
    });

    it("in query use analyzer during query building phase", async () => {
        const session = store.openSession();
        await session.store(foo({ name: "MaCiEj" }));
        await session.store(foo({ name: "Gracjan" }));
        await session.store(foo({ name: null }));
        await session.saveChanges();

        const query = await session.advanced.documentQuery(Foo)
            .whereIn("name", ["MACIEJ", null])
            .waitForNonStaleResults()
            .all();
        assertThat(query).hasSize(2);
    });
});
