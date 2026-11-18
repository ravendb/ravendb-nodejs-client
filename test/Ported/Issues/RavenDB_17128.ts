import assert from "node:assert";
import { ConcurrencyViolation, IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";

class Document {
    public value: number;
}

describe("RavenDB_17128", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    async function saveChangesViolations(save: () => Promise<void>): Promise<ConcurrencyViolation[]> {
        let error: Error & { concurrencyViolations?: ConcurrencyViolation[] };
        await assert.rejects(async () => save(), (err: Error) => {
            error = err;
            return true;
        });

        assert.strictEqual(error.name, "ClusterTransactionConcurrencyException");
        assert.ok(error.concurrencyViolations);
        return error.concurrencyViolations;
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

        const violations = await saveChangesViolations(() => session.saveChanges());

        assert.strictEqual(violations.length, 2);

        assert.strictEqual(violations[0].type, "CompareExchange");
        assert.strictEqual(violations[0].id, "usernames/ravendb");
        assert.strictEqual(violations[0].expected, 0);
        assert.ok(violations[0].actual > 0);

        assert.strictEqual(violations[1].type, "CompareExchange");
        assert.strictEqual(violations[1].id, "emails/info@ravendb.net");
        assert.strictEqual(violations[1].expected, 0);
        assert.ok(violations[1].actual > 0);
    });

    it("concurrency exception should include conflicts info for cluster wide documents", async () => {
        {
            const session = store.openSession({ transactionMode: "ClusterWide" });
            await session.store(Object.assign(new Document(), { value: 1 }), "objects/1");
            await session.store(Object.assign(new Document(), { value: 2 }), "objects/2");
            await session.saveChanges();
        }

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

        const violations = await saveChangesViolations(() => session.saveChanges());

        assert.strictEqual(violations.length, 2);

        assert.strictEqual(violations[0].type, "Document");
        assert.strictEqual(violations[0].id, "rvn-atomic/objects/1");
        assert.ok(violations[0].expected > 0);
        assert.ok(violations[0].actual > 0);

        assert.strictEqual(violations[1].type, "Document");
        assert.strictEqual(violations[1].id, "rvn-atomic/objects/2");
        assert.ok(violations[1].expected > 0);
        assert.ok(violations[1].actual > 0);
    });
});
