import * as assert from "assert";
import { User } from "../../Assets/Entities";
import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import {
    IDocumentStore,
    DocumentCountersOperation,
    CounterOperation,
    CounterBatch,
    CounterBatchOperation,
    GetCountersOperation,
} from "../../../src";
import { CONSTANTS } from "../../../src/Constants";
import { assertThat } from "../../Utils/AssertExtensions";
import { StringUtil } from "../../../src/Utility/StringUtil";

describe("CountersSingleNodeTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    it("can increment counter", async () => {
        {
            const session = store.openSession();
            const user = new User();
            user.name = "Aviv";
            await session.store(user, "users/1-A");
            await session.saveChanges();
        }

        let documentCountersOperation = new DocumentCountersOperation();
        documentCountersOperation.documentId = "users/1-A";
        documentCountersOperation.operations = [ 
            CounterOperation.create("likes", "Increment", 0)
        ];
        let counterBatch = new CounterBatch();
        counterBatch.documents = [ documentCountersOperation ];
        await store.operations.send(new CounterBatchOperation(counterBatch));

        let details = await store.operations.send(new GetCountersOperation("users/1-A", ["likes"]));
        let val = details.counters[0].totalValue;
        assert.strictEqual(val, 0);

        documentCountersOperation = new DocumentCountersOperation();
        documentCountersOperation.documentId = "users/1-A";
        documentCountersOperation.operations = [ CounterOperation.create("likes", "Increment", 10) ];
        counterBatch = new CounterBatch();
        counterBatch.documents = [documentCountersOperation];
        await store.operations.send(new CounterBatchOperation(counterBatch));
        details = await store.operations.send(new GetCountersOperation("users/1-A", ["likes"]));
        val = details.counters[0].totalValue;
        assert.strictEqual(val, 10);

        documentCountersOperation = new DocumentCountersOperation();
        documentCountersOperation.documentId = "users/1-A";
        documentCountersOperation.operations = [
            CounterOperation.create("likes", "Increment", -3)
        ];

        counterBatch = new CounterBatch();
        counterBatch.documents = [documentCountersOperation];
        await store.operations.send(new CounterBatchOperation(counterBatch));
        details = await store.operations.send(new GetCountersOperation("users/1-A", ["likes"]));
        val = details.counters[0].totalValue;
        assert.strictEqual(val, 7);
    });

    it("getCounterValueUsingPOST", async () => {
        {
            const session = store.openSession();
            const user = new User();
            user.name = "Aviv";
            await session.store(user, "users/1-A");
            await session.saveChanges();
        }

        const longCounterName = "a".repeat(500);

        const documentCountersOperation = new DocumentCountersOperation();
        documentCountersOperation.documentId = "users/1-A";
        documentCountersOperation.operations = [
            CounterOperation.create(longCounterName, "Increment", 5)
        ];

        const counterBatch = new CounterBatch();
        counterBatch.documents = [ documentCountersOperation ];

        await store.operations.send(new CounterBatchOperation(counterBatch));

        {
            const session = store.openSession();
            const dic = await session.countersFor("users/1-A")
                .get([longCounterName, "no_such"]);
            assertThat(dic)
                .hasSize(1)
                .containsEntry(longCounterName, 5);
        }
    });

    it("can get counter value", async function () {
        {
            const session = store.openSession();
            const user = new User();
            user.name = "Aviv";
            await session.store(user, "users/1-A");
            await session.saveChanges();
        }

        let documentCountersOperation = new DocumentCountersOperation();
        documentCountersOperation.documentId = "users/1-A";
        documentCountersOperation.operations = [CounterOperation.create("likes", "Increment", 5)];
        let counterBatch = new CounterBatch();
        counterBatch.documents = [documentCountersOperation];
        const a = await store.operations.send(new CounterBatchOperation(counterBatch));
        documentCountersOperation = new DocumentCountersOperation();
        documentCountersOperation.documentId = "users/1-A";
        documentCountersOperation.operations = [CounterOperation.create("likes", "Increment", 10)];
        counterBatch = new CounterBatch();
        counterBatch.documents = [documentCountersOperation];
        const b = await store.operations.send(new CounterBatchOperation(counterBatch));
        const details = await store.operations.send(new GetCountersOperation("users/1-A", ["likes"]));
        const val = details.counters[0].totalValue;
        assert.strictEqual(val, 15);
    });

    it("can delete counter", async function () {
        {
            const session = store.openSession();
            await session.store(Object.assign(new User(), { name: "Aviv1" }), "users/1-A");
            await session.store(Object.assign(new User(), { name: "Aviv2" }), "users/2-A");
            await session.saveChanges();
        }

        const documentCountersOperation1 = new DocumentCountersOperation();
        documentCountersOperation1.documentId = "users/1-A";
        documentCountersOperation1.operations = [CounterOperation.create("likes", "Increment", 10)];

        const documentCountersOperation2 = new DocumentCountersOperation();
        documentCountersOperation2.documentId = "users/2-A";
        documentCountersOperation2.operations = [CounterOperation.create("likes", "Increment", 20)];

        let counterBatch = new CounterBatch();
        counterBatch.documents = [documentCountersOperation1, documentCountersOperation2];
        await store.operations.send(new CounterBatchOperation(counterBatch));

        let deleteCounter = new DocumentCountersOperation();
        deleteCounter.documentId = "users/1-A";
        deleteCounter.operations = [CounterOperation.create("likes", "Delete")];

        counterBatch = new CounterBatch();
        counterBatch.documents = [deleteCounter];
        await store.operations.send(new CounterBatchOperation(counterBatch));

        const countersDetail = await store.operations.send(new GetCountersOperation("users/1-A", ["likes"]));
        assertThat(countersDetail.counters)
            .hasSize(1);
        assertThat(countersDetail.counters[0])
            .isNull();

        deleteCounter = new DocumentCountersOperation();
        deleteCounter.documentId = "users/2-A";
        deleteCounter.operations = [CounterOperation.create("likes", "Delete")];
        counterBatch = new CounterBatch();
        counterBatch.documents = [deleteCounter];

        await store.operations.send(new CounterBatchOperation(counterBatch));
        const deleteResult = await store.operations.send(new GetCountersOperation("users/2-A", ["likes"]));
        assertThat(countersDetail.counters)
            .hasSize(1);
        assertThat(countersDetail.counters[0])
            .isNull();
    });

    it("multi get", async function () {
        {
            const session = store.openSession();
            const user = new User();
            user.name = "Aviv";
            await session.store(user, "users/1-A");
            await session.saveChanges();
        }

        const documentCountersOperation1 = new DocumentCountersOperation();
        documentCountersOperation1.documentId = "users/1-A";
        documentCountersOperation1.operations = [
            CounterOperation.create("likes", "Increment", 5),
            CounterOperation.create("dislikes", "Increment", 10)
        ];
        const counterBatch = new CounterBatch();
        counterBatch.documents = [documentCountersOperation1];
        await store.operations.send(new CounterBatchOperation(counterBatch));
        const { counters } = await store.operations.send(new GetCountersOperation("users/1-A", ["likes", "dislikes"]));
        assert.strictEqual(counters.length, 2);
        assert.strictEqual(
            counters.filter(x => x.counterName === "likes")[0].totalValue, 5);
        assert.strictEqual(counters.filter(x => x.counterName === "dislikes")[0].totalValue, 10);
    });

    it("multiSetAndGetViaBatch", async function() {
        {
            const session = store.openSession();
            await session.store(Object.assign(new User(), { name: "Aviv1" }), "users/1-A");
            await session.store(Object.assign(new User(), { name: "Aviv2" }), "users/2-A");
            await session.saveChanges();
        }

        let documentCountersOperation1 = new DocumentCountersOperation();
        documentCountersOperation1.documentId = "users/1-A";
        documentCountersOperation1.operations = [
            CounterOperation.create("likes", "Increment", 5),
            CounterOperation.create("dislikes", "Increment", 10)
        ];
        let documentCountersOperation2 = new DocumentCountersOperation();
        documentCountersOperation2.documentId = "users/2-A";
        documentCountersOperation2.operations = [
            CounterOperation.create("rank", "Increment", 20)
        ];

        const setBatch = new CounterBatch();
        setBatch.documents = [documentCountersOperation1, documentCountersOperation2];
        await store.operations.send(new CounterBatchOperation(setBatch));
        documentCountersOperation1 = new DocumentCountersOperation();
        documentCountersOperation1.documentId = "users/1-A";
        documentCountersOperation1.operations = [
            CounterOperation.create("likes", "Get"),
            CounterOperation.create("dislikes", "Get")
        ];
        documentCountersOperation2 = new DocumentCountersOperation();
        documentCountersOperation2.documentId = "users/2-A";
        documentCountersOperation2.operations = [ 
            CounterOperation.create("rank", "Get")
        ];
        const getBatch = new CounterBatch();
        getBatch.documents = [documentCountersOperation1, documentCountersOperation2];
        const countersDetail = await store.operations.send(new CounterBatchOperation(getBatch));
        assert.strictEqual(countersDetail.counters.length, 3);
        assert.strictEqual(countersDetail.counters[0].counterName, "likes");
        assert.strictEqual(countersDetail.counters[0].documentId, "users/1-A");
        assert.strictEqual(countersDetail.counters[0].totalValue, 5);
        assert.strictEqual(countersDetail.counters[1].counterName, "dislikes");
        assert.strictEqual(countersDetail.counters[1].documentId, "users/1-A");
        assert.strictEqual(countersDetail.counters[1].totalValue, 10);
        assert.strictEqual(countersDetail.counters[2].counterName, "rank");
        assert.strictEqual(countersDetail.counters[2].documentId, "users/2-A");
        assert.strictEqual(countersDetail.counters[2].totalValue, 20);
    });

    it("deleteCreateWithSameNameDeleteAgain", async function () {
        {
            const session = store.openSession();
            const user = new User();
            user.name = "Aviv";
            await session.store(user, "users/1-A");
            await session.saveChanges();
        }
        
        let documentCountersOperation1 = new DocumentCountersOperation();
        documentCountersOperation1.documentId = "users/1-A";
        documentCountersOperation1.operations = [
            CounterOperation.create("likes", "Increment", 10)
        ];
        let batch = new CounterBatch();
        batch.documents = [documentCountersOperation1];
        await store.operations.send(new CounterBatchOperation(batch));
        let result = await store.operations.send(new GetCountersOperation("users/1-A", ["likes"]));
        assert.strictEqual(result.counters[0].totalValue, 10);
        documentCountersOperation1 = new DocumentCountersOperation();
        documentCountersOperation1.documentId = "users/1-A";
        documentCountersOperation1.operations = [
            CounterOperation.create("likes", "Delete")
        ];
        batch = new CounterBatch();
        batch.documents = [documentCountersOperation1];
        await store.operations.send(new CounterBatchOperation(batch));
        result = await store.operations.send(new GetCountersOperation("users/1-A", [ "likes" ]));
        assertThat(result.counters)
            .hasSize(1);
        assertThat(result.counters[0])
            .isNull();

        documentCountersOperation1 = new DocumentCountersOperation();
        documentCountersOperation1.documentId = "users/1-A";
        documentCountersOperation1.operations = [
            CounterOperation.create("likes", "Increment", 20)
        ];
        batch = new CounterBatch();
        batch.documents = [documentCountersOperation1];
        await store.operations.send(new CounterBatchOperation(batch));
        result = await store.operations.send(new GetCountersOperation("users/1-A", ["likes"]));
        assert.strictEqual(result.counters[0].totalValue, 20);
        documentCountersOperation1 = new DocumentCountersOperation();
        documentCountersOperation1.documentId = "users/1-A";
        documentCountersOperation1.operations = [
            CounterOperation.create("likes", "Delete")
        ];
        batch = new CounterBatch();
        batch.documents = [documentCountersOperation1];
        await store.operations.send(new CounterBatchOperation(batch));
        result = await store.operations.send(new GetCountersOperation("users/1-A", ["likes"]));
        assertThat(result.counters)
            .hasSize(1);
        assertThat(result.counters[0])
            .isNull();
    });

    it("incrementAndDeleteShouldChangeDocumentMetadata", async function () {
        {
            const session = store.openSession();
            const user = new User();
            user.name = "Aviv";
            await session.store(user, "users/1-A");
            await session.saveChanges();
        }
        {
            const documentCountersOperation1 = new DocumentCountersOperation();
            documentCountersOperation1.documentId = "users/1-A";
            documentCountersOperation1.operations = [
                CounterOperation.create("likes", "Increment", 10),
            ];
            const batch = new CounterBatch();
            batch.documents = [documentCountersOperation1];
            await store.operations.send(new CounterBatchOperation(batch));
        }
        {
            const session = store.openSession();
            const user = await session.load("users/1-A");
            const metadata = session.advanced.getMetadataFor(user);
            const counters = metadata["@counters"];
            assert.strictEqual(counters.length, 1);
            assert.strictEqual(counters[0], "likes");
        }
        {
            const documentCountersOperation1 = new DocumentCountersOperation();
            documentCountersOperation1.documentId = "users/1-A";
            documentCountersOperation1.operations = [
                CounterOperation.create("votes", "Increment", 50),
            ];
            const batch = new CounterBatch();
            batch.documents = [documentCountersOperation1];
            await store.operations.send(new CounterBatchOperation(batch));
        }
        {
            const session = store.openSession();
            const user = await session.load("users/1-A");
            const metadata = session.advanced.getMetadataFor(user);
            const counters = metadata["@counters"];
            assert.strictEqual(counters.length, 2);
            assert.ok(counters.includes("likes"));
            assert.ok(counters.includes("votes"));
        }
        {
            const documentCountersOperation1 = new DocumentCountersOperation();
            documentCountersOperation1.documentId = "users/1-A";
            documentCountersOperation1.operations = [
                CounterOperation.create("likes", "Delete"),
            ];
            const batch = new CounterBatch();
            batch.documents = [documentCountersOperation1];
            await store.operations.send(new CounterBatchOperation(batch));
        }
        {
            const session = store.openSession();
            const user = await session.load("users/1-A");
            const metadata = session.advanced.getMetadataFor(user);
            const counters = metadata["@counters"];
            assert.strictEqual(counters.length, 1);
            assert.ok(counters.includes("votes"));
        }
        {
            const documentCountersOperation1 = new DocumentCountersOperation();
            documentCountersOperation1.documentId = "users/1-A";
            documentCountersOperation1.operations = [
                CounterOperation.create("votes", "Delete"),
            ];
            const batch = new CounterBatch();
            batch.documents = [documentCountersOperation1];
            await store.operations.send(new CounterBatchOperation(batch));
        }
        {
            const session = store.openSession();
            const user = await session.load("users/1-A");
            const metadata = session.advanced.getMetadataFor(user);
            assert.ok(!(CONSTANTS.Documents.Metadata.COUNTERS in metadata));
        }
    });

    it("counterNameShouldPreserveCase", async function () {
        {
            const session = store.openSession();
            const user = new User();
            user.name = "Aviv";
            await session.store(user, "users/1-A");
            await session.saveChanges();

            session.countersFor("users/1-A").increment("Likes", 10);
            await session.saveChanges();
        }
        {
            const session = store.openSession();
            const user = await session.load("users/1-A");
            const val = await session.countersFor(user).get("Likes");
            assert.strictEqual(val, 10);
            const counters = session.advanced.getCountersFor(user);
            assert.strictEqual(counters.length, 1);
            assert.strictEqual(counters[0], "Likes");
        }
    });
});
