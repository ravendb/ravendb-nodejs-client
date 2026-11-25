import {
    CounterBatch,
    CounterBatchOperation,
    CounterOperation,
    CountersBatchCommandData,
    DocumentCountersOperation,
    GetCountersOperation,
    IDocumentStore
} from "../../../src/index.js";
import { User } from "../../Assets/Entities.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

describe("RavenDB_22150", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    async function storeUserWithCounters() {
        {
            const session = store.openSession();
            const user = new User();
            user.name = "Danielle";
            await session.store(user, "users/1");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const documentCounters = session.countersFor("users/1");
            documentCounters.increment("Likes", 10);
            documentCounters.increment("Dislikes", 20);
            documentCounters.increment("Downloads", 30);
            await session.saveChanges();
        }
    }

    it("increment by default value", async () => {
        await storeUserWithCounters();

        const incrementLikesByFive = new CounterOperation();
        incrementLikesByFive.type = "Increment";
        incrementLikesByFive.counterName = "likes";
        incrementLikesByFive.delta = 5;

        const incrementDislikesByDefault = new CounterOperation();
        incrementDislikesByDefault.type = "Increment";
        incrementDislikesByDefault.counterName = "dislikes";

        const documentCountersOperation = new DocumentCountersOperation();
        documentCountersOperation.documentId = "users/1";
        documentCountersOperation.operations = [incrementLikesByFive, incrementDislikesByDefault];

        const counterBatch = new CounterBatch();
        counterBatch.documents = [documentCountersOperation];

        const operationResult = await store.operations.send(new CounterBatchOperation(counterBatch));

        assertThat(operationResult.counters[1].totalValue).isEqualTo(21);
    });

    it("increment by default value through deferred counters batch command", async () => {
        await storeUserWithCounters();

        {
            const session = store.openSession();
            session.advanced.defer(
                new CountersBatchCommandData("users/1", CounterOperation.create("dislikes", "Increment")));
            await session.saveChanges();
        }

        const counters = await store.operations.send(new GetCountersOperation("users/1", ["dislikes"]));
        assertThat(counters.counters[0].totalValue).isEqualTo(21);
    });
});
