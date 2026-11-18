import { Company } from "../../Assets/Entities.js";
import { assertThat } from "../../Utils/AssertExtensions.js";
import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil.js";

import {
    AbstractJavaScriptIndexCreationTask,
    IDocumentStore,
    QueryTimings,
} from "../../../src/index.js";

describe("RavenDB-9587", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    it("timingsShouldWork", async () => {
        {
            const session = store.openSession();
            await session.store(Object.assign(new Company(), { name: "CF" }));
            await session.store(Object.assign(new Company(), { name: "HR" }));
            await session.saveChanges();
        }
        {
            const session = store.openSession();
            let timings: QueryTimings;
            const companies = await session
                .query({ collection: "companies" })
                .timings(_ => timings = _)
                .whereNotEquals("name", "HR")
                .all();

            assertThat(timings.durationInMs)
                .isGreaterThan(0);
            assertThat(timings.timings)
                .isNotNull();
            assertThat(timings instanceof QueryTimings)
                .isTrue();
            for (const key of Object.keys(timings.timings)) {
                assertThat(timings.timings[key] instanceof QueryTimings)
                    .isTrue();
            }
        }

    });

    it("queryPlan", async function () {
        {
            const session = store.openSession();
            const company = new Company();
            company.name = "test";
            await session.store(company);
            await session.saveChanges();
        }

        await store.executeIndex(new CompanyIndex());

        await testContext.waitForIndexing(store);

        {
            const session = store.openSession();
            let timings: QueryTimings;

            const companies = await session
                .query(Company, CompanyIndex)
                .timings(t => timings = t)
                .whereNotEquals("name", "HR")
                .all();

            assertThat(timings.durationInMs)
                .isGreaterThan(0);
            assertThat(timings.queryPlan)
                .isNotNull();
        }
    });
});


class CompanyIndex extends AbstractJavaScriptIndexCreationTask<Company> {

    constructor() {
        super();

        this.map("Companies", u => {
            return {
                name: u.name,
            }
        });

        this.searchEngineType = "Corax";
    }
}