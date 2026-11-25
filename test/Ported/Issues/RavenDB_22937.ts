import {
    AbstractCsharpIndexCreationTask,
    Explanations,
    IDocumentQuery,
    IDocumentSession,
    IDocumentStore
} from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class Dto {
    public id: string;
    public name: string;

    public constructor(name?: string) {
        this.name = name;
    }
}

class StandardIndex extends AbstractCsharpIndexCreationTask {
    public constructor() {
        super();

        this.map = "from dto in docs.Dtos select new { dto.name }";
        this.index("name", "Search");
    }
}

describe("RavenDB_22937", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        testContext.customizeDbRecord = r => {
            r.settings = {
                ...r.settings,
                "Indexing.Static.SearchEngineType": "Lucene",
                "Indexing.Auto.SearchEngineType": "Lucene"
            };
        };
        store = await testContext.getDocumentStore();
    });

    afterEach(async () => {
        testContext.customizeDbRecord = null;
        await disposeTestDocumentStore(store);
    });

    it("staticIndexStandardAnalyzerCanSearchForWildcardsInSearch", async () => {
        await new StandardIndex().execute(store);
        await standardAnalyzerCanSearchForWildcardsInSearch(
            session => session.query(Dto, StandardIndex).waitForNonStaleResults(), "name");
    });

    it("autoIndexStandardAnalyzerCanSearchForWildcardsInSearch", async () => {
        await standardAnalyzerCanSearchForWildcardsInSearch(
            session => session.query(Dto).waitForNonStaleResults(), "search(name)");
    });

    async function standardAnalyzerCanSearchForWildcardsInSearch(
        createQuery: (session: IDocumentSession) => IDocumentQuery<Dto>, indexFieldName: string) {
        const session = store.openSession();
        session.advanced.waitForIndexesAfterSaveChanges();
        await session.store(new Dto("MacCOMMONiej"));
        await session.store(new Dto("RavCOMMONenDB"));
        await session.saveChanges();

        let explanations: Explanations;

        let result = await createQuery(session)
            .includeExplanations(e => explanations = e)
            .search("name", "Mac*")
            .first();
        assertThat(result.name)
            .isEqualTo("MacCOMMONiej");
        assertThat(explanations.getExplanations(result.id)[0])
            .contains(`${indexFieldName}:mac*`);

        result = await createQuery(session)
            .includeExplanations(e => explanations = e)
            .search("name", "*db")
            .first();
        assertThat(result.name)
            .isEqualTo("RavCOMMONenDB");
        assertThat(explanations.getExplanations(result.id)[0])
            .contains(`${indexFieldName}:*db`);

        const results = await createQuery(session)
            .includeExplanations(e => explanations = e)
            .search("name", "*COMMON*")
            .all();
        assertThat(results)
            .hasSize(2);
        assertThat(explanations.getExplanations(results[0].id)[0])
            .contains(`${indexFieldName}:*common*`);
        assertThat(explanations.getExplanations(results[1].id)[0])
            .contains(`${indexFieldName}:*common*`);
    }
});
