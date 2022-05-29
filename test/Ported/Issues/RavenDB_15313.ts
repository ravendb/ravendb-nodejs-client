import { GetCountersOperation, IDocumentStore } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { User } from "../../Assets/Entities";
import { assertThat } from "../../Utils/AssertExtensions";

describe("RavenDB_15313", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("getCountersOperationShouldFilterDuplicateNames", async () => {
        const docId = "users/1";

        const names = [ "likes", "dislikes", "likes", "downloads", "likes", "downloads" ];

        {
            const session = store.openSession();
            await session.store(new User(), docId);

            const cf = session.countersFor(docId);

            for (let i = 0; i < names.length; i++) {
                cf.increment(names[i], i);
            }

            await session.saveChanges();
        }

        const vals = await store.operations.send(new GetCountersOperation(docId, names));
        assertThat(vals.counters)
            .hasSize(3);

        let expected = 6; // likes
        assertThat(vals.counters[0].totalValue)
            .isEqualTo(expected);

        expected = 1; // dislikes
        assertThat(vals.counters[1].totalValue)
            .isEqualTo(expected);

        expected = 8;
        assertThat(vals.counters[2].totalValue)
            .isEqualTo(expected);
    });

    it("getCountersOperationShouldFilterDuplicateNames_PostGet", async () => {
        const docId = "users/1";

        const names: string[] = new Array(1024);
        const dict = new Map<string, number>();

        {
            const session = store.openSession();
            await session.store(new User(), docId);

            const cf = session.countersFor(docId);

            for (let i = 0; i < 1024; i++) {
                let name: string;
                if (i % 4 === 0) {
                    name = "abc";
                } else if (i % 10 === 0) {
                    name = "xyz";
                } else {
                    name = "likes" + i;
                }

                names[i] = name;
                const oldVal = dict.get(name) || 0;
                dict.set(name, oldVal + i);

                cf.increment(name, i);
            }

            await session.saveChanges();
        }

        const vals = await store.operations.send(new GetCountersOperation(docId, names));

        const expectedCount = dict.size;

        assertThat(vals.counters)
            .hasSize(expectedCount);

        const hs = new Set(names);

        const expectedVals = names
            .filter(x => hs.delete(x))
            .map(x => dict.get(x));

        for (let i = 0; i < vals.counters.length; i++) {
            assertThat(expectedVals[i])
                .isEqualTo(vals.counters[i].totalValue);
        }
    })
});
