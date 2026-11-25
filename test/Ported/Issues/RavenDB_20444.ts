import { Explanations, IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class Doc {
    public id: string;
    public strVal: string;
    public numVal: number;

    public constructor(strVal?: string, numVal?: number) {
        this.strVal = strVal;
        this.numVal = numVal;
    }
}

describe("RavenDB_20444", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("boostingIsNotAppliedToCorrectSubclause", async () => {
        const session = store.openSession();
        let explanations: Explanations;
        const query = session.advanced.documentQuery(Doc)
            .openSubclause()
            .search("strVal", "match")
            .andAlso()
            .openSubclause()
            .whereGreaterThanOrEqual("numVal", 0)
            .orElse()
            .whereEquals("numVal", null)
            .closeSubclause()
            .closeSubclause()
            .boost(0)
            .orderByScore()
            .orderByDescending("numVal", "Long")
            .includeExplanations(e => explanations = e);

        assertThat(query.toString())
            .isEqualTo("from 'Docs' where boost(search(strVal, $p0) and (numVal >= $p1 or numVal = $p2), $p3) order by score(), numVal as long desc include explanations()");
    });

    it("rbqShouldNotBeMergedInCaseWhenBoostIsSet", async () => {
        const session = store.openSession();
        const doc1 = new Doc("Côte de Blaye", 263.5);
        const doc2 = new Doc("Escargots de Bourgogne", 13.25);
        await session.store(doc1);
        await session.store(doc2);
        await session.saveChanges();

        let explanations: Explanations;
        await session.advanced.documentQuery(Doc)
            .waitForNonStaleResults()
            .openSubclause()
            .search("strVal", "\"De\"")
            .andAlso()
            .openSubclause()
            .whereGreaterThanOrEqual("numVal", 0)
            .orElse()
            .whereEquals("numVal", null)
            .closeSubclause()
            .closeSubclause()
            .boost(0)
            .andAlso()
            .openSubclause()
            .openSubclause()
            .whereNotEquals("numVal", null)
            .closeSubclause()
            .boost(100)
            .orElse()
            .whereEquals("numVal", null)
            .closeSubclause()
            .includeExplanations(e => explanations = e)
            .all();

        assertThat(explanations.getExplanations(doc1.id)[0].startsWith("0 = (MATCH) sum"))
            .isFalse();
        assertThat(explanations.getExplanations(doc2.id)[0].startsWith("0 = (MATCH) sum"))
            .isFalse();
    });

    it("getExplanationsReturnsNullForUnknownKey", async () => {
        const session = store.openSession();
        await session.store(new Doc("match", 1), "docs/1");
        await session.saveChanges();

        let explanations: Explanations;
        await session.advanced.documentQuery(Doc)
            .waitForNonStaleResults()
            .search("strVal", "match")
            .includeExplanations(e => explanations = e)
            .all();

        assertThat(explanations.getExplanations("docs/1"))
            .isNotNull();
        assertThat(explanations.getExplanations("docs/2"))
            .isNull();
        assertThat(explanations.getExplanations("constructor"))
            .isNull();
    });
});
