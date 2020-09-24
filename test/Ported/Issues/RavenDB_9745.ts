import { Company } from "../../Assets/Entities";
import { assertThat } from "../../Utils/AssertExtensions";
import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import {
    IDocumentStore,
    AbstractIndexCreationTask,
} from "../../../src";
import { Explanations } from "../../../src/Documents/Queries/Explanation/Explanations";
import { ExplanationOptions } from "../../../src/Documents/Queries/Explanation/ExplanationOptions";

class CompaniesByNameIndexResult {
    public key: string;
    public count: number;
}

class CompaniesByNameIndex extends AbstractIndexCreationTask {

    public constructor() {
        super();

        this.map = "from c in docs.companies select new { key = c.name, count = 1 }";

        this.reduce = "from result in results " +
            "group result by result.key " +
            "into g " +
            "select new " +
            "{ " +
            "  key = g.Key, " +
            "  count = g.Sum(x => x.count) " +
            "}";

        this.store("key", "Yes");
    }
}

describe("RavenDB-9745", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    it("explain", async () => {
        const index = new CompaniesByNameIndex();
        await index.execute(store);

        {
            const session = store.openSession();
            await session.store(Object.assign(new Company(), { name: "Micro" }));
            await session.store(Object.assign(new Company(), { name: "Microsoft" }));
            await session.store(Object.assign(new Company(), { name: "Google" }));
            await session.saveChanges();
        }

        await testContext.waitForIndexing(store);

        {
            const session = store.openSession();
            let explanations: Explanations;
            const companies = await session
                .advanced
                .documentQuery<Company>({ collection: "companies" })
                .includeExplanations(e => explanations = e)
                .search("name", "Micro*")
                .all();

            assertThat(companies)
                .hasSize(2);

            let exp = explanations.explanations[companies[0].id];
            assertThat(exp)
                .isNotNull();

            exp = explanations.explanations[companies[1].id];
            assertThat(exp)
                .isNotNull();
        }

        {
            const session = store.openSession();
            const explOptions = { groupKey: "key" } as ExplanationOptions;
            let explanationsResult;

            const results = await session.advanced
                .documentQuery({ indexName: index.getIndexName() })
                .includeExplanations(explOptions, e => explanationsResult = e)
                .selectFields<CompaniesByNameIndexResult>([ "key", "count" ])
                .all();

            assertThat(results)
                .hasSize(3);

            let exp = explanationsResult.explanations[results[0].key];
            assertThat(exp)
                .isNotNull();

            exp = explanationsResult.explanations[results[1].key];
            assertThat(exp)
                .isNotNull();

            exp = explanationsResult.explanations[results[2].key];
            assertThat(exp)
                .isNotNull();
        }
    });
});
