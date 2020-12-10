import { IDocumentStore } from "../../../src/Documents/IDocumentStore";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { QueryStatistics } from "../../../src/Documents/Session/QueryStatistics";
import { User } from "../../Assets/Entities";
import { assertThat } from "../../Utils/AssertExtensions";
import { AbstractJavaScriptIndexCreationTask } from "../../../src";

describe("RavenDB_12902", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("afterAggregationQueryExecutedShouldBeExecutedOnlyOnce", async () => {
        await store.executeIndex(new UsersByName());

        {
            const session = store.openSession();

            let counter = 0;

            let stats: QueryStatistics;

            const results = await session.query(User, UsersByName)
                .statistics(s => stats = s)
                .on("afterQueryExecuted", () => counter++)
                .whereEquals("lastName", "Doe")
                .aggregateBy(x => x.byField("name").sumOn("count"))
                .execute();

            assertThat(results)
                .hasSize(1);
            assertThat(results["name"].values.length)
                .isZero();
            assertThat(stats)
                .isNotNull();
            assertThat(counter)
                .isEqualTo(1);
        }
    });

    it("afterSuggestionQueryExecutedShouldBeExecutedOnlyOnce", async () => {
        await store.executeIndex(new UsersByName());

        {
            const session = store.openSession();

            let counter = 0;

            let stats: QueryStatistics;

            const results = await session.query(User, UsersByName)
                .statistics(s => stats = s)
                .on("afterQueryExecuted", () => counter++)
                .suggestUsing(x => x.byField("name", "Orin"))
                .execute();

            assertThat(results)
                .hasSize(1);
            assertThat(results["name"].suggestions)
                .hasSize(0);
            assertThat(stats)
                .isNotNull();
            assertThat(counter)
                .isEqualTo(1);
        }
    });

    it("afterLazyQueryExecutedShouldBeExecutedOnlyOnce", async () => {
        {
            const session = store.openSession();

            let counter = 0;

            let stats: QueryStatistics;

            const results = await session.query(User)
                .on("afterQueryExecuted", () => counter++)
                .statistics(s => stats = s)
                .whereEquals("name", "Doe")
                .lazily()
                .getValue();

            assertThat(results)
                .hasSize(0);
            assertThat(stats)
                .isNotNull();
            assertThat(counter)
                .isEqualTo(1);
        }
    });

    it("afterLazyAggregationQueryExecutedShouldBeExecutedOnlyOnce", async () => {
        await store.executeIndex(new UsersByName());
        {
            const session = store.openSession();
            let counter = 0;

            let stats: QueryStatistics;

            const results = await session.query(User, UsersByName)
                .statistics(s => stats = s)
                .on("afterQueryExecuted", () => counter++)
                .whereEquals("name", "Doe")
                .aggregateBy(x => x.byField("name").sumOn("count"))
                .executeLazy()
                .getValue();

            assertThat(results)
                .hasSize(1);
            assertThat(results["name"].values)
                .hasSize(0);
            assertThat(stats)
                .isNotNull();
            assertThat(counter)
                .isEqualTo(1);
        }
    });

    it("afterLazySuggestionQueryExecutedShouldBeExecutedOnlyOnce", async () => {
        await store.executeIndex(new UsersByName());

        {
            const session = store.openSession();

            let counter = 0;

            let stats: QueryStatistics;

            const results = await session.query(User, UsersByName)
                .on("afterQueryExecuted", () => counter++)
                .statistics(s => stats = s)
                .suggestUsing(x => x.byField("name", "Orin"))
                .executeLazy()
                .getValue();

            assertThat(results)
                .hasSize(1);

            assertThat(results["name"].suggestions.length)
                .isZero();
            assertThat(stats)
                .isNotNull();
            assertThat(counter)
                .isEqualTo(1);
        }
    });

    it("canGetValidStatisticsInAggregationQuery", async () => {
        await store.executeIndex(new UsersByName());

        {
            const session = store.openSession();

            let stats: QueryStatistics;

            await session
                .query(User, UsersByName)
                .statistics(s => stats = s)
                .whereEquals("name", "Doe")
                .aggregateBy(x => x.byField("name").sumOn("count"))
                .execute();

            assertThat(stats.indexName)
                .isNotNull();
        }
    });

    it("canGetValidStatisticsInSuggestionQuery", async () => {
        await store.executeIndex(new UsersByName());

        {
            const session = store.openSession();

            let stats: QueryStatistics;

            await session
                .query(User, UsersByName)
                .statistics(s => stats = s)
                .suggestUsing(x => x.byField("name", "Orin"))
                .execute();

            assertThat(stats.indexName)
                .isNotNull();
        }
    });
});

class UsersByName extends AbstractJavaScriptIndexCreationTask<User, { name: string, lastName: string }> {
    public constructor() {
        super();

        this.map(User, u => {
            return {
                name: u.name,
                lastName: u.lastName
            }
        });

        this.suggestion("name");
    }
}