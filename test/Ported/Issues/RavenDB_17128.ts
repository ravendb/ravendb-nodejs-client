import { ConcurrencyViolation, IDocumentStore, PutDocumentCommand } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions.js";

class Document {
    public value: number;
}

type ConcurrencyError = Error & {
    id?: string;
    expectedChangeVector?: string;
    actualChangeVector?: string;
    concurrencyViolations?: ConcurrencyViolation[];
};

describe("RavenDB_17128", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    async function captureError(expectedName: string, action: () => Promise<unknown>): Promise<ConcurrencyError> {
        return assertThrows(action, err => assertThat(err.name).isEqualTo(expectedName));
    }

    async function storeObjects(): Promise<void> {
        const session = store.openSession({ transactionMode: "ClusterWide" });
        await session.store(Object.assign(new Document(), { value: 1 }), "objects/1");
        await session.store(Object.assign(new Document(), { value: 2 }), "objects/2");
        await session.saveChanges();
    }

    it("concurrency exception should include conflicts info for cluster wide compare exchange", async () => {
        {
            const session = store.openSession({ transactionMode: "ClusterWide" });
            session.advanced.clusterTransaction.createCompareExchangeValue("usernames/ravendb", {});
            session.advanced.clusterTransaction.createCompareExchangeValue("emails/info@ravendb.net", {});
            await session.saveChanges();
        }

        const session = store.openSession({ transactionMode: "ClusterWide" });
        session.advanced.clusterTransaction.createCompareExchangeValue("usernames/ravendb", {});
        session.advanced.clusterTransaction.createCompareExchangeValue("emails/info@ravendb.net", {});

        const error = await captureError("ClusterTransactionConcurrencyException", () => session.saveChanges());
        const violations = error.concurrencyViolations;

        assertThat(violations).isNotNull();
        assertThat(violations).hasSize(2);

        assertThat(violations[0].type).isEqualTo("CompareExchange");
        assertThat(violations[0].id).isEqualTo("usernames/ravendb");
        assertThat(violations[0].expected).isEqualTo(0);
        assertThat(violations[0].actual).isGreaterThan(0);

        assertThat(violations[1].type).isEqualTo("CompareExchange");
        assertThat(violations[1].id).isEqualTo("emails/info@ravendb.net");
        assertThat(violations[1].expected).isEqualTo(0);
        assertThat(violations[1].actual).isGreaterThan(0);
    });

    it("concurrency exception should include conflicts info for cluster wide documents", async () => {
        await storeObjects();

        const session = store.openSession({ transactionMode: "ClusterWide" });
        const session2 = store.openSession({ transactionMode: "ClusterWide" });

        const o1 = await session.load("objects/1", Document);
        const o2 = await session.load("objects/2", Document);

        const o12 = await session2.load("objects/1", Document);
        const o22 = await session2.load("objects/2", Document);

        o12.value = 12;
        o22.value = 22;

        await session2.saveChanges();

        o1.value = 13;
        o2.value = 23;

        const error = await captureError("ClusterTransactionConcurrencyException", () => session.saveChanges());
        const violations = error.concurrencyViolations;

        assertThat(violations).isNotNull();
        assertThat(violations).hasSize(2);

        assertThat(violations[0].type).isEqualTo("Document");
        assertThat(violations[0].id).isEqualTo("rvn-atomic/objects/1");
        assertThat(violations[0].expected).isGreaterThan(0);
        assertThat(violations[0].actual).isGreaterThan(0);

        assertThat(violations[1].type).isEqualTo("Document");
        assertThat(violations[1].id).isEqualTo("rvn-atomic/objects/2");
        assertThat(violations[1].expected).isGreaterThan(0);
        assertThat(violations[1].actual).isGreaterThan(0);
    });

    it("concurrency exception should include conflicts info for single node documents", async () => {
        await storeObjects();

        const session = store.openSession();
        const session2 = store.openSession();

        session.advanced.useOptimisticConcurrency = true;
        session2.advanced.useOptimisticConcurrency = true;

        const o1 = await session.load("objects/1", Document);
        const o2 = await session.load("objects/2", Document);

        const o12 = await session2.load("objects/1", Document);
        const o22 = await session2.load("objects/2", Document);

        o12.value = 12;
        o22.value = 22;

        await session2.saveChanges();

        o1.value = 13;
        o2.value = 23;

        const error = await captureError("ConcurrencyException", () => session.saveChanges());

        assertThat(error.expectedChangeVector).isNotNull();
        assertThat(error.actualChangeVector).isNotNull();
    });

    it("concurrency exception should include conflicts info for document put", async () => {
        {
            const session = store.openSession({ transactionMode: "ClusterWide" });
            await session.store(Object.assign(new Document(), { value: 1 }), "objects/1");
            await session.saveChanges();
        }

        const session = store.openSession();
        const doc = await session.load("objects/1", Document);
        const changeVector = session.advanced.getChangeVectorFor(doc);

        const command = new PutDocumentCommand("new/1", changeVector, { name: "ayende" });
        const error = await captureError("ConcurrencyException", () => store.getRequestExecutor().execute(command));

        assertThat(error.expectedChangeVector).isEqualTo(changeVector);
    });
});
