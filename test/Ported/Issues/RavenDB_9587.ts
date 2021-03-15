import { Company } from "../../Assets/Entities";
import { assertThat } from "../../Utils/AssertExtensions";
import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import {
    IDocumentStore,
    QueryTimings,
} from "../../../src";

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
            Object.keys(timings.timings).forEach(key => {
                assertThat(timings.timings[key] instanceof QueryTimings)
                    .isTrue();
            });
        }

    });
});
