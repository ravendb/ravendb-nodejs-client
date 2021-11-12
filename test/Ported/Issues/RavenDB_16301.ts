import { IDocumentStore, Lazy, QueryData } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { Company } from "../../Assets/Entities";
import { ConditionalLoadResult } from "../../../src/Documents/Session/ConditionalLoadResult";
import { assertThat } from "../../Utils/AssertExtensions";

describe("RavenDB_16301", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canUseConditionalLoadLazily", async () => {
        {
            const bulkInsert = store.bulkInsert();

            try {
                for (let i = 0; i < 100; i++) {
                    await bulkInsert.store(new Company());
                }
            } finally {
                await bulkInsert.finish();
            }
        }

        let ids: Result[];
        const loads: Lazy<ConditionalLoadResult<Company>>[] = [];

        {
            const session1 = store.openSession();

            ids = await session1.advanced.documentQuery(Company)
                .waitForNonStaleResults()
                .selectFields(QueryData.customFunction("o", "{ id : id(o), changeVector : getMetadata(o)['@change-vector'] }"), Result)
                .all();

            await session1.load(ids.map(x => x.id));

            let c = 0;
            const res = await session1.load(ids.map(x => x.id).slice(0, 50), Company);
            for (const kvp of Object.entries(res)) {
                kvp[1].phone = (++c).toString();
            }

            await session1.saveChanges();
        }

        {
            const session = store.openSession();
            // load last 10
            await session.load(ids.slice(90, 100).map(x => x.id));

            const numberOfRequestsPerSession = session.advanced.numberOfRequests;

            for (const res of ids) {
                loads.push(session.advanced.lazily.conditionalLoad(res.id, res.changeVector, Company));
            }

            await session.advanced.eagerly.executeAllPendingLazyOperations();

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(numberOfRequestsPerSession + 1);

            for (let i = 0; i < 100; i++) {
                const l = loads[i];

                assertThat(l.isValueCreated())
                    .isFalse();

                const conditionalLoadResult = await l.getValue();

                if (i < 50) {
                    // load from server
                    assertThat(conditionalLoadResult.entity.id)
                        .isEqualTo(ids[i].id);
                } else if (i < 90) {
                    // not modified
                    assertThat(conditionalLoadResult.entity)
                        .isNull();
                    assertThat(conditionalLoadResult.changeVector)
                        .isEqualTo(ids[i].changeVector);
                } else {
                    // tracked in session
                    assertThat(conditionalLoadResult.entity.id)
                        .isEqualTo(ids[i].id);
                    assertThat(conditionalLoadResult.entity)
                        .isNotNull();
                    assertThat(conditionalLoadResult.changeVector)
                        .isEqualTo(ids[i].changeVector);
                }
            }

            // not exist on server
            const lazy = session.advanced.lazily.conditionalLoad("Companies/322-A", ids[0].changeVector, Company);
            const load = await lazy.getValue();
            assertThat(load.entity)
                .isNull();
            assertThat(load.changeVector)
                .isNull();
        }
    });
});

class Result {
    public id: string;
    public changeVector: string;
}