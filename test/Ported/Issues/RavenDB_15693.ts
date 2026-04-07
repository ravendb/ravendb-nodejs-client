import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

describe("RavenDB_15693", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("nestedSubclauseBoostDoesNotCorruptOuterBoost", async () => {
        const s = store.openSession();
        const q = s.query(Doc)
            .openSubclause()
                .openSubclause()
                    .search("strVal1", "a")
                    .orElse()
                    .search("strVal2", "b")
                .closeSubclause()
                .boost(0.5)
                .orElse()
                .search("strVal3", "c")
            .closeSubclause()
            .boost(0.2);

        const queryBoost = q.toString();

        // The outer boost (0.2) should wrap the entire outer subclause,
        // and the inner boost (0.5) should only wrap the inner subclause.
        assertThat(queryBoost)
            .contains("boost(boost(search(strVal1, $p0) or search(strVal2, $p1), $p2) or search(strVal3, $p3), $p4)");
    });

    it("canQueryOnComplexBoost", async () => {
        const s = store.openSession();
        const q = s.query(Doc)
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