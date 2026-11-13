import assert from "node:assert";
import { addMinutes } from "date-fns";
import {
    CollectionDetails,
    GetCollectionStatisticsOperation,
    GetDetailedCollectionStatisticsOperation,
    IDocumentStore
} from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { Address, Company, User } from "../../Assets/Entities.js";

describe("RavenDB_23754", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    async function storeSampleData() {
        const session = store.openSession();
        await session.store(Object.assign(new User(), { name: "user1" }), "users/1");
        await session.store(Object.assign(new User(), { name: "user2" }), "users/2");
        const user3 = Object.assign(new User(), { name: "user3" });
        await session.store(user3, "users/3");
        await session.store(Object.assign(new Company(), { name: "com1" }), "com/1");
        await session.store(Object.assign(new Company(), { name: "com2" }), "com/2");
        await session.store(Object.assign(new Address(), { city: "city1" }), "add/1");

        const now = new Date();
        session.timeSeriesFor("users/1", "heartrate").append(now, 72, "wrist");

        await session.saveChanges();

        session.advanced.revisions.forceRevisionCreationFor("users/1");
        session.advanced.revisions.forceRevisionCreationFor("com/1");

        await session.delete(user3);

        session.advanced.attachments.store("users/1", "hello.txt", Buffer.from("hello"));

        session.countersFor("users/1").increment("likes", 5);
        session.countersFor("com/1").increment("views", 10);

        session.timeSeriesFor("users/1", "heartrate").delete(addMinutes(now, -5), addMinutes(now, -1));

        await session.saveChanges();
    }

    function byName(collections: Record<string, CollectionDetails>, name: string): CollectionDetails {
        return Object.values(collections).find(x => x.name === name);
    }

    it("getCollectionStatsTests", async () => {
        await storeSampleData();

        const collectionStats = await store.maintenance.send(new GetCollectionStatisticsOperation());

        assert.strictEqual(Object.keys(collectionStats.collections).length, 3);
        assert.strictEqual(collectionStats.countOfDocuments, 5);
        assert.strictEqual(collectionStats.countOfConflicts, 0);

        const detailed = await store.maintenance.send(new GetDetailedCollectionStatisticsOperation());

        assert.strictEqual(Object.keys(detailed.collections).length, 3);
        assert.strictEqual(detailed.countOfDocuments, 5);
        assert.strictEqual(detailed.countOfConflicts, 0);
        assert.strictEqual(detailed.countOfRevisionDocuments, 2);
        assert.strictEqual(detailed.countOfTombstones, 1);
        assert.strictEqual(detailed.countOfAttachments, 1);
        assert.strictEqual(detailed.countOfCounterEntries, 2);
        assert.strictEqual(detailed.countOfTimeSeriesSegments, 1);
        assert.strictEqual(detailed.countOfTimeSeriesDeletedRanges, 1);
        assert.strictEqual(detailed.countOfDocumentsConflicts, 0);
        assert.strictEqual(byName(detailed.collections, "Users").countOfDocuments, 2);
        assert.strictEqual(byName(detailed.collections, "Companies").countOfDocuments, 2);
        assert.strictEqual(byName(detailed.collections, "Addresses").countOfDocuments, 1);
    });

    it("collection statistics carry the same counters as the detailed ones", async () => {
        await storeSampleData();

        const collectionStats = await store.maintenance.send(new GetCollectionStatisticsOperation());

        assert.strictEqual(collectionStats.countOfRevisionDocuments, 2);
        assert.strictEqual(collectionStats.countOfTombstones, 1);
        assert.strictEqual(collectionStats.countOfAttachments, 1);
        assert.strictEqual(collectionStats.countOfCounterEntries, 2);
        assert.strictEqual(collectionStats.countOfTimeSeriesSegments, 1);
        assert.strictEqual(collectionStats.countOfTimeSeriesDeletedRanges, 1);
        assert.strictEqual(collectionStats.countOfDocumentsConflicts, 0);
    });

    it("collection details carry per collection counters and sizes", async () => {
        await storeSampleData();

        const detailed = await store.maintenance.send(new GetDetailedCollectionStatisticsOperation());
        const users = byName(detailed.collections, "Users");

        assert.strictEqual(users.countOfTombstones, 1);
        assert.strictEqual(users.countOfRevisions, 1);
        assert.strictEqual(users.countOfCounterEntries, 1);
        assert.strictEqual(users.countOfTimeSeriesSegments, 1);
        assert.strictEqual(users.countOfTimeSeriesDeletedRanges, 1);

        for (const size of [
            users.timeSeriesSegmentsSize, users.timeSeriesDeletedRangesSize, users.counterEntriesSize]) {
            assert.ok(size.sizeInBytes > 0);
            assert.ok(size.humaneSize);
        }

        const addresses = byName(detailed.collections, "Addresses");
        assert.strictEqual(addresses.countOfTombstones, 0);
        assert.strictEqual(addresses.countOfRevisions, 0);
        assert.strictEqual(addresses.counterEntriesSize.sizeInBytes, 0);
    });
});
