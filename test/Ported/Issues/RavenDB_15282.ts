import { IDocumentStore } from "../../../src/Documents/IDocumentStore";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { User } from "../../Assets/Entities";
import { GetCountersOperation } from "../../../src/Documents/Operations/Counters/GetCountersOperation";
import { assertThat } from "../../Utils/AssertExtensions";

describe("RavenDB_15282", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("countersPostGetReturnFullResults", async () => {
        const docId = "users/1";

        const counterNames = [];

        {
            const session = store.openSession();
            await session.store(new User(), docId);

            const c = session.countersFor(docId);

            for (let i = 0; i < 1000; i++) {
                const name = "likes" + i;
                counterNames.push(name);
                c.increment(name);
            }

            await session.saveChanges();
        }

        const vals = await store.operations.send(new GetCountersOperation(docId, counterNames, true));
        assertThat(vals.counters)
            .hasSize(1000);

        for (let i = 0; i < 1000; i++) {
            assertThat(vals.counters[i].counterValues)
                .hasSize(1);
            const values = vals.counters[i].counterValues;
            assertThat(values[Object.keys(values)[0]])
                .isEqualTo(1);
        }
    });

});
