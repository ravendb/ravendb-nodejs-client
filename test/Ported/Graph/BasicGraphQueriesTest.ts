import { IDocumentStore } from "../../../src/Documents/IDocumentStore";
import { disposeTestDocumentStore, RavenTestContext, testContext } from "../../Utils/TestUtil";
import { DocumentType } from "../../../src/Documents/DocumentAbstractions";
import { CreateSampleDataOperation } from "../../Utils/CreateSampleDataOperation";
import { assertThat } from "../../Utils/AssertExtensions";
import { Movie } from "../../Assets/Graph";

(RavenTestContext.is60Server ? describe.skip : describe)("BasicGraphQueriesTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("query_with_no_matches_and_select_should_return_empty_result", async () => {
        await testContext.samples.createDogDataWithoutEdges(store);

        {
            const session = store.openSession();
            const results = await session.advanced.rawQuery(" match (Dogs as a)-[Likes]->(Dogs as f)<-[Likes]-(Dogs as b)\n" +
                " select {\n" +
                "     a: a,\n" +
                "     f: f,\n" +
                "     b: b\n" +
                " }")
                .all();
            assertThat(results)
                .hasSize(0);
        }
    });

    it("query_with_no_matches_and_without_select_should_return_empty_result", async () => {
        await testContext.samples.createDogDataWithoutEdges(store);

        {
            const session = store.openSession();
            const results = await session.advanced.rawQuery("match (Dogs as a)-[Likes]->(Dogs as f)<-[Likes]-(Dogs as b)")
                .all();
            assertThat(results)
                .hasSize(0);
        }
    });

    it("empty_vertex_node_should_work", async () => {
        await testContext.samples.createMoviesData(store);

        {
            const session = store.openSession();
            const results = await session.advanced.rawQuery<Movie>("match ()-[hasRated select movie]->(Movies as m) select m", Movie)
                .all();
            assertThat(results)
                .hasSize(5);
        }
    });

    it("can_flatten_result_for_single_vertex_in_row", async () => {
        await testContext.samples.createMoviesData(store);

        {
            const session = store.openSession();

            const allVerticesQuery = await session.advanced.rawQuery("match (_ as v)")
                .all();

            assertThat(allVerticesQuery)
                .anySatisfy(x => {
                    assertThat(x["_ as v"])
                        .isNull();
                })
        }
    });

    it("mutliple_results_in_row_wont_flatten_results", async () => {
        await testContext.samples.createMoviesData(store);

        {
            const session = store.openSession();
            const allVerticesQuery = await session.advanced
                .rawQuery("match (_ as u)-[hasRated select movie]->(_ as m)")
                .all();

            assertThat(allVerticesQuery)
                .allMatch(x => !!x.m);

            assertThat(allVerticesQuery)
                .allMatch(x => !!x.u);
        }
    });

    it("can_query_without_collection_identifier", async () => {
        await testContext.samples.createMoviesData(store);

        {
            const session = store.openSession();
            const allVerticesQuery = await session.advanced.rawQuery("match (_ as v)")
                .all();

            assertThat(allVerticesQuery)
                .hasSize(9);

            const docTypes = allVerticesQuery.map(x => x["@metadata"]["@collection"]);
            assertThat(docTypes.filter(x => x === "Genres"))
                .hasSize(3);
            assertThat(docTypes.filter(x => x === "Movies"))
                .hasSize(3);
            assertThat(docTypes.filter(x => x === "Users"))
                .hasSize(3);
        }
    });

    it("can_use_explicit_with_clause", async () => {
        await testContext.samples.createMoviesData(store);

        {
            const session = store.openSession();
            const results = await session.advanced.rawQuery("with {from Users} as u match (u)")
                .all();

            assertThat(results)
                .hasSize(3);

            const docTypes = results.map(x => x["@metadata"]["@collection"]);

            assertThat(docTypes)
                .allMatch(x => x === "Users");
        }
    });

    it("can_filter_vertices_with_explicit_with_clause", async () => {
        await testContext.samples.createMoviesData(store);

        {
            const session = store.openSession();
            const results = (await session
                .advanced
                .rawQuery("with {from Users where id() = 'users/2'} as u match (u) select u.name")
                .all())
                .map(x => x["name"]);

            assertThat(results)
                .hasSize(1);

            assertThat(results[0])
                .isEqualTo("Jill");
        }
    });

    it("findReferences", async () => {
        await testContext.samples.createSimpleData(store);

        {
            const session = store.openSession();

            const result = await session
                .advanced
                .rawQuery("match (Entities as e)-[references as r]->(Entities as e2)")
                .all();

            assertThat(result)
                .hasSize(3)
                .anySatisfy(item => {
                    assertThat(item["e"]["name"])
                        .isEqualTo("A");
                    assertThat(item["e2"]["name"])
                        .isEqualTo("B");
                })
                .anySatisfy(item => {
                    assertThat(item["e"]["name"])
                        .isEqualTo("B");
                    assertThat(item["e2"]["name"])
                        .isEqualTo("C");
                })
                .anySatisfy(item => {
                    assertThat(item["e"]["name"])
                        .isEqualTo("C");
                    assertThat(item["e2"]["name"])
                        .isEqualTo("A");
                });
        }
    })
});

class StalenessParameters {
    public waitForIndexing: boolean = true;
    public waitForNonStaleResults: boolean = false;
    public waitForNonStaleResultsDurationInSeconds: number = 15;
}

async function query<T>(documentType: DocumentType,
                        q: string,
                        mutate: (store: IDocumentStore) => void,
                        parameters: StalenessParameters) {
    if (!parameters) {
        parameters = new StalenessParameters();
    }

    let store: IDocumentStore;
    try {
        store = await testContext.getDocumentStore();

        await store.maintenance.send(new CreateSampleDataOperation(["Documents", "Indexes"]));

        mutate?.(store);

        if (parameters.waitForIndexing) {
            await testContext.indexes.waitForIndexing(store);
        }

        {
            const session = store.openSession();
            let query = session.advanced.rawQuery(q, documentType);
            if (parameters.waitForNonStaleResults) {
                query = query.waitForNonStaleResults(100 * parameters.waitForNonStaleResultsDurationInSeconds);
            }

            return query.all();
        }
    } finally {
        store.dispose();
    }
}
