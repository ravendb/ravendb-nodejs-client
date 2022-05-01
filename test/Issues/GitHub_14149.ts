import { IDocumentStore } from "../../src/Documents/IDocumentStore";
import { disposeTestDocumentStore, testContext } from "../Utils/TestUtil";
import { Company } from "../Assets/Entities";
import { SessionOptions } from "../../src/Documents/Session/SessionOptions";
import { assertThat } from "../Utils/AssertExtensions";
import { IndexDefinition } from "../../src/Documents/Indexes/IndexDefinition";
import { AbstractCsharpIndexCreationTask } from "../../src/Documents/Indexes";
import { Facet } from "../../src/Documents/Queries/Facets/Facet";
import { QueryStatistics } from "../../src";

describe("GitHub_14149", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canGetCorrectStatsFromDocumentQueryWhenUsingAggregation", async () => {
        await new Companies().execute(store);

        {
            const session = store.openSession();
            const company1 = Object.assign(new Company(), {
              name: "Apple",
              desc: "Software"
            });
            const company2 = Object.assign(new Company(), {
              name: "Google",
              desc: "Software"
            });
            const company3 = Object.assign(new Company(), {
              name: "Microsoft",
              desc: "Software"
            });
            await session.store(company1);
            await session.store(company2);
            await session.store(company3);
            await session.saveChanges();
        }

        await testContext.waitForIndexing(store);

        const sessionOptions: SessionOptions = {
            noCaching: true
        };

        {
            let stats: QueryStatistics;
            const facet = new Facet();
            facet.fieldName = "desc";

            const session = store.openSession(sessionOptions);
            const query = session.query(Company, Companies).whereEquals("desc", "Software");
            const companies_lazy = query.statistics(s => (stats = s)).lazily();
            const facet_query = query.aggregateBy(facet).executeLazy();
            
            await companies_lazy.getValue();
            await facet_query.getValue();

            // stats.totalResults should equal 3 but it equals 1 which is the # of facets returned not the number of docs returned from the first query
            assertThat(stats.totalResults).isEqualTo(3);
        }
    });
});

// tslint:disable-next-line:class-name
class Companies extends AbstractCsharpIndexCreationTask {
    createIndexDefinition(): IndexDefinition {
        const indexDefinition = new IndexDefinition();
        indexDefinition.name = "Companies";
        indexDefinition.maps = new Set(["from c in docs.Companies select new { name = c.name, desc = c.desc };"]);

        return indexDefinition;
    }
}
