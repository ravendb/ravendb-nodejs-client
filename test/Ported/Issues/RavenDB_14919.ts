import { GetCountersOperation, IDocumentStore } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { User } from "../../Assets/Entities";
import { assertThat } from "../../Utils/AssertExtensions";
import { GetDocumentsCommand } from "../../../src/Documents/Commands/GetDocumentsCommand";

describe("RavenDB_14919", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("getCountersOperationShouldDiscardNullCounters", async () => {
        const docId = "users/2";

        const counterNames = new Array(124);

        {
            const session = store.openSession();
            await session.store(new User(), docId);

            const c = session.countersFor(docId);
            for (let i = 0; i < 100; i++) {
                const name = "likes" + i;
                counterNames[i] = name;
                c.increment(name);
            }

            await session.saveChanges();
        }

        let vals = await store.operations.send(new GetCountersOperation(docId, counterNames));
        assertThat(vals.counters)
            .hasSize(101);

        for (let i = 0; i < 100; i++) {
            assertThat(vals.counters[i].totalValue)
                .isEqualTo(1);
        }

        assertThat(vals.counters[vals.counters.length - 1])
            .isNull();

        // test with returnFullResults = true

        vals = await store.operations.send(new GetCountersOperation(docId, counterNames, true));
        assertThat(vals.counters)
            .hasSize(101);

        for (let i = 0; i < 100; i++) {
            assertThat(vals.counters[i].counterValues)
                .hasSize(1);
        }

        assertThat(vals.counters[vals.counters.length - 1])
            .isNull();
    });

    it("getCountersOperationShouldDiscardNullCounters_PostGet", async () => {
        const docId = "users/2";
        const counterNames = new Array(1024);

        {
            const session = store.openSession();
            await session.store(new User(), docId);

            const c = session.countersFor(docId);

            for (let i = 0; i < 1000; i++) {
                const name = "likes" + i;
                counterNames[i] = name;
                c.increment(name, i);
            }

            await session.saveChanges();
        }

        let vals = await store.operations.send(new GetCountersOperation(docId, counterNames));
        assertThat(vals.counters)
            .hasSize(1001);

        for (let i = 0; i < 1000; i++) {
            assertThat(vals.counters[i].totalValue)
                .isEqualTo(i);
        }

        assertThat(vals.counters[vals.counters.length - 1])
            .isNull();

        // test with returnFullResults = true

        vals = await store.operations.send(new GetCountersOperation(docId, counterNames, true));
        assertThat(vals.counters)
            .hasSize(1001);

        for (let i = 0; i < 1000; i++) {
            assertThat(vals.counters[i].totalValue)
                .isEqualTo(i);
        }

        assertThat(vals.counters[vals.counters.length - 1])
            .isNull();
    });

    it("getDocumentsCommandShouldDiscardNullIds", async () => {
        const ids = new Array(124);

        {
            const session = store.openSession();
            for (let i = 0; i < 100; i++) {
                const id = "users/" + i;
                ids[i] = id;
                await session.store(new User(), id);
            }

            await session.saveChanges();
        }

        const re = store.getRequestExecutor();
        const command = new GetDocumentsCommand({
            ids,
            conventions: re.conventions,
            metadataOnly: false
        });
        await re.execute(command);

        assertThat(command.result.results)
            .hasSize(101);
        assertThat(command.result.results[command.result.results.length - 1])
            .isNull();
    });

    it("getDocumentsCommandShouldDiscardNullIds_PostGet", async () => {
        const ids = new Array(1024);

        {
            const session = store.openSession();
            for (let i = 0; i < 1000; i++) {
                const id = "users/" + i;
                ids[i] = id;
                await session.store(new User(), id);
            }

            await session.saveChanges();
        }

        const re = store.getRequestExecutor();
        const command = new GetDocumentsCommand({
            ids,
            conventions: re.conventions,
            metadataOnly: false
        });

        await re.execute(command);

        assertThat(command.result.results)
            .hasSize(1001);

        assertThat(command.result.results[command.result.results.length - 1])
            .isNull();
    })
});