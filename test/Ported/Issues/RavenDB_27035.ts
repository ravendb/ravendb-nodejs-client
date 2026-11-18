import assert from "node:assert";
import {
    AbstractCsharpIndexCreationTask,
    IDocumentStore,
    QueryInspectionNode,
    QueryTimings
} from "../../../src/index.js";
import { INDEXES } from "../../../src/Constants.js";
import { disposeTestDocumentStore, RavenTestContext, testContext } from "../../Utils/TestUtil.js";

class Movie {
    public id: string;
    public title: unknown;
    public year: number;
}

class Movies_ByTitle extends AbstractCsharpIndexCreationTask {
    public constructor() {
        super();
        this.map = "from m in docs.Movies select new { m.title }";
    }
}

class Movies_ByTitleAndYear extends AbstractCsharpIndexCreationTask {
    public constructor() {
        super();
        this.map = "from m in docs.Movies select new { m.title, m.year }";
    }
}

function planOperations(node: QueryInspectionNode): string[] {
    return [node.operation, ...(node.children ?? []).flatMap(planOperations)];
}

function planContains(node: QueryInspectionNode, operation: string): boolean {
    return planOperations(node).some(x => x?.toLowerCase().includes(operation.toLowerCase()));
}

const itOnServerWithMissingEntriesFix = RavenTestContext.isRavenDbServerVersion("7.2") ? it : it.skip;

describe("RavenDB_27035", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore("RavenDB_27035", false, null, record => {
            record.settings[INDEXES.INDEXING_AUTO_SEARCH_ENGINE_TYPE] = "Corax";
            record.settings[INDEXES.INDEXING_STATIC_SEARCH_ENGINE_TYPE] = "Corax";
        });
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    async function storeMovies(movies: Partial<Movie>[]) {
        const session = store.openSession();
        for (const movie of movies) {
            await session.store(Object.assign(new Movie(), movie));
        }
        await session.saveChanges();
    }

    async function executeIndex(index: AbstractCsharpIndexCreationTask) {
        await index.execute(store);
        await testContext.waitForIndexing(store);
    }

    async function queryWithPlan(rql: string) {
        const session = store.openSession();
        let timings: QueryTimings;
        const results = await session.advanced.rawQuery(rql, Movie)
            .timings(x => timings = x)
            .all();

        return { results, plan: timings.queryPlan };
    }

    async function setupNullAndMissingValues(extraStringTitle: boolean) {
        const movies: Partial<Movie>[] = [
            { id: "movies/1", title: 10, year: 2001 },
            { id: "movies/2", title: 20, year: 2002 },
            { id: "movies/3", title: null, year: 2003 },
            { id: "movies/4", year: 2004 }
        ];

        if (extraStringTitle) {
            movies.push({ id: "movies/5", title: "Alpha", year: 2005 });
        }

        await storeMovies(movies);
        await executeIndex(new Movies_ByTitleAndYear());
    }

    it("streamingOptimizationIsStillUsedWhenTheSortFieldIsHomogeneous", async () => {
        await storeMovies(Array.from({ length: 10 }, (_, i) => ({ id: `movies/${i}`, title: i })));
        await executeIndex(new Movies_ByTitle());

        const { results, plan } = await queryWithPlan("from index 'Movies/ByTitle' order by title as long include timings()");

        assert.strictEqual(results.length, 10);
        assert.ok(planContains(plan, "TermNumericRangeProvider"), planOperations(plan).join(" -> "));
        assert.ok(!planContains(plan, "SortingMatch"), planOperations(plan).join(" -> "));
    });

    it("streamingOptimizationIsStillUsedWhenTheSortFieldIsAllStrings", async () => {
        await storeMovies(Array.from({ length: 10 }, (_, i) => ({ id: `movies/${i}`, title: `movie-${i}` })));
        await executeIndex(new Movies_ByTitle());

        const { results, plan } = await queryWithPlan("from index 'Movies/ByTitle' order by title include timings()");

        assert.strictEqual(results.length, 10);
        assert.ok(planContains(plan, "TermRangeProvider"), planOperations(plan).join(" -> "));
        assert.ok(!planContains(plan, "SortingMatch"), planOperations(plan).join(" -> "));
    });

    it("streamingOptimizationIsStillUsedWhenTheOnlyGapsAreNullAndMissingValues", async () => {
        await setupNullAndMissingValues(false);

        const { results, plan } = await queryWithPlan("from index 'Movies/ByTitleAndYear' order by title as long include timings()");

        assert.strictEqual(results.length, 4);
        assert.ok(planContains(plan, "TermNumericRangeProvider"), planOperations(plan).join(" -> "));
        assert.ok(!planContains(plan, "SortingMatch"), planOperations(plan).join(" -> "));
    });

    itOnServerWithMissingEntriesFix("oneValueOfAnotherTypeIsEnoughToDisqualifyTheScan", async () => {
        await setupNullAndMissingValues(true);

        const { results, plan } = await queryWithPlan("from index 'Movies/ByTitleAndYear' order by title as long include timings()");

        assert.strictEqual(results.length, 5);
        assert.ok(planContains(plan, "SortingMatch"), planOperations(plan).join(" -> "));
    });

    itOnServerWithMissingEntriesFix("orderByAsLongShouldNotDropDocumentsWhenAListHoldsNullAndANumber", async () => {
        await storeMovies([
            { id: "movies/1", title: [null, 10] },
            { id: "movies/2", title: "Alpha" }
        ]);
        await executeIndex(new Movies_ByTitle());

        const { results, plan } = await queryWithPlan("from index 'Movies/ByTitle' order by title as long include timings()");

        assert.strictEqual(results.length, 2, planOperations(plan).join(" -> "));
    });

    itOnServerWithMissingEntriesFix("orderByShouldNotDropAnEntryThatProducedNoTerm", async () => {
        await storeMovies([
            { id: "movies/1", title: "Alpha", year: 2001 },
            { id: "movies/2", title: [], year: 2002 },
            { id: "movies/3", year: 2003 }
        ]);
        await executeIndex(new Movies_ByTitleAndYear());

        const { results, plan } = await queryWithPlan("from index 'Movies/ByTitleAndYear' order by title include timings()");

        assert.strictEqual(results.length, 3, planOperations(plan).join(" -> "));
    });
});
