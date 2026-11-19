import { IDocumentStore, SessionLoadStartingWithOptions } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class SomeEntity {
    public id: string;
}

const ENTITY_IDS = [
    "FooBar1", "BarFoo2", "FooBar3", "FooBar11", "FooBar12", "FooBar21",
    "FooBar5", "BarFoo7", "FooBar111", "BarFoo6", "FooBar6", "FooBar8"
];

describe("RavenDB_1379_Client_Lazy", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    async function storeEntities() {
        const session = store.openSession();
        for (const id of ENTITY_IDS) {
            const entity = new SomeEntity();
            entity.id = id;
            await session.store(entity);
        }
        await session.saveChanges();
    }

    async function lazilyLoadStartingWithIds(opts: SessionLoadStartingWithOptions<SomeEntity>): Promise<string[]> {
        const session = store.openSession();
        const fetchedDocuments = await session.advanced.lazily
            .loadStartingWith<SomeEntity>("FooBar", opts)
            .getValue();
        return Object.values(fetchedDocuments).map(doc => doc.id);
    }

    function assertContainsExactly(foundDocKeys: string[], expected: string[]) {
        assertThat(foundDocKeys).hasSize(expected.length);
        for (const key of expected) {
            assertThat(foundDocKeys).contains(key);
        }
    }

    async function assertPagingWithoutFilters() {
        await storeEntities();

        assertContainsExactly(
            await lazilyLoadStartingWithIds({ matches: "", start: 0, pageSize: 4, exclude: "" }),
            ["FooBar1", "FooBar11", "FooBar111", "FooBar12"]);

        assertContainsExactly(
            await lazilyLoadStartingWithIds({ matches: "", start: 4, pageSize: 4, exclude: "" }),
            ["FooBar21", "FooBar3", "FooBar5", "FooBar6"]);

        assertContainsExactly(
            await lazilyLoadStartingWithIds({ matches: "", start: 8, pageSize: 4, exclude: "" }),
            ["FooBar8"]);
    }

    it("paging without filters", async () => {
        await assertPagingWithoutFilters();
    });

    it("paging without filters with paging information", async () => {
        await assertPagingWithoutFilters();
    });

    it("paging with excludes with paging information", async () => {
        await storeEntities();

        assertContainsExactly(
            await lazilyLoadStartingWithIds({ matches: "", start: 0, pageSize: 2, exclude: "1*" }),
            ["FooBar21", "FooBar3"]);

        assertContainsExactly(
            await lazilyLoadStartingWithIds({ matches: "", start: 2, pageSize: 2, exclude: "1*" }),
            ["FooBar5", "FooBar6"]);

        assertContainsExactly(
            await lazilyLoadStartingWithIds({ matches: "", start: 4, pageSize: 2, exclude: "1*" }),
            ["FooBar8"]);
    });

    it("paging with matches with paging information", async () => {
        await storeEntities();

        assertContainsExactly(
            await lazilyLoadStartingWithIds({ matches: "1*", start: 0, pageSize: 2 }),
            ["FooBar1", "FooBar11"]);

        assertContainsExactly(
            await lazilyLoadStartingWithIds({ matches: "1*", start: 2, pageSize: 1 }),
            ["FooBar111"]);

        assertContainsExactly(
            await lazilyLoadStartingWithIds({ matches: "1*", start: 3, pageSize: 10 }),
            ["FooBar12"]);
    });
});
