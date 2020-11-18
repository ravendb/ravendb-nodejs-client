import { IDocumentStore } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { assertThat } from "../../Utils/AssertExtensions";

describe("RavenDB_15693", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canQueryOnComplexBoost", async () => {
        const s = store.openSession();
        const q = s.advanced.documentQuery(Doc)
            .search("strVal1", "a")
            .andAlso()
            .openSubclause()
            .search("strVal2", "b")
            .orElse()
            .search("strVal3", "search")
            .closeSubclause()
            .boost(0.2);

        const queryBoost = q.toString();

        assertThat(queryBoost)
            .isEqualTo("from 'Docs' where search(strVal1, $p0) and boost(search(strVal2, $p1) or search(strVal3, $p2), $p3)");

        await q.all();
    });
});

class Doc {
    public strVal1: string;
    public strVal2: string;
    public strVal3: string;
}