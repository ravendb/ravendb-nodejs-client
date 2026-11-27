import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class Bar {
    public id: string;
    public title: string = null;
}

class Foo {
    public id: string;
    public barIdInKey: Record<string, string>;
    public barIdInValue: Record<string, string>;

    public static of(bars: Bar[]): Foo {
        return Object.assign(new Foo(), {
            barIdInKey: Object.fromEntries(bars.map(b => [b.id, "Some Value"])),
            barIdInValue: Object.fromEntries(bars.map(b => ["Some Key", b.id]))
        });
    }
}

describe("RavenDB_2907", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    async function makeAndStoreEntities() {
        const session = store.openSession();
        const bar = new Bar();
        await session.store(bar);
        const foo = Foo.of([bar]);
        await session.store(foo);
        await session.saveChanges();
        return { foo, bar };
    }

    it("can include dictionary key", async () => {
        const entities = await makeAndStoreEntities();
        const session = store.openSession();
        const loaded = await session.include("barIdInKey.$Keys").load(entities.foo.id, Foo);
        assertThat(loaded).isNotNull();
        assertThat(session.advanced.numberOfRequests).isEqualTo(1);
        const bar = await session.load(entities.bar.id, Bar);
        assertThat(bar).isNotNull();
        assertThat(session.advanced.numberOfRequests).isEqualTo(1);
    });

    it("can include dictionary value", async () => {
        const entities = await makeAndStoreEntities();
        const session = store.openSession();
        const foo = await session.include("barIdInValue.$Values").load(entities.foo.id, Foo);
        assertThat(foo).isNotNull();
        assertThat(session.advanced.numberOfRequests).isEqualTo(1);
        const bar = await session.load(entities.bar.id, Bar);
        assertThat(bar).isNotNull();
        assertThat(session.advanced.numberOfRequests).isEqualTo(1);
    });
});
