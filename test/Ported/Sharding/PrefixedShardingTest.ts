import assert from "node:assert";
import {
    AddPrefixedShardingSettingOperation,
    CONSTANTS,
    DeletePrefixedShardingSettingOperation,
    DocumentStore,
    GetDatabaseRecordOperation,
    IDocumentStore,
    PrefixedShardingSetting,
    ShardingConfiguration,
    UpdatePrefixedShardingSettingOperation
} from "../../../src/index.js";
import { disposeTestDocumentStore } from "../../Utils/TestUtil.js";
import { getShardedDocumentStore } from "../../Utils/ShardingTestUtil.js";
import { User } from "../../Assets/Entities.js";
import { Company, Order, Product } from "../../Assets/Orders.js";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions.js";

const NUMBER_OF_BUCKETS = 1024 * 1024;

class Item {
    public id: string;
}

interface PrefixedShardingSettingWithRange extends PrefixedShardingSetting {
    bucketRangeStart: number;
}

describe("PrefixedSharding", function () {

    let store: DocumentStore;

    afterEach(async () => {
        if (store) {
            await disposeTestDocumentStore(store);
            store = null;
        }
    });

    const getShardedStore = getShardedDocumentStore;

    async function getShardingConfiguration(documentStore: IDocumentStore): Promise<ShardingConfiguration> {
        const record = await documentStore.maintenance.server.send(new GetDatabaseRecordOperation(documentStore.database));
        return record.sharding;
    }

    function prefixedWithRanges(sharding: ShardingConfiguration) {
        return sharding.prefixed as PrefixedShardingSettingWithRange[];
    }

    function shardSession(documentStore: IDocumentStore, shardNumber: number) {
        return documentStore.openSession({ database: documentStore.database + "$" + shardNumber });
    }

    async function countStartingWith(documentStore: IDocumentStore, shardNumber: number, prefix: string) {
        return (await shardSession(documentStore, shardNumber).advanced.loadStartingWith(prefix, { pageSize: 1024 })).length;
    }

    async function storeItems(documentStore: IDocumentStore, ids: string[]) {
        const session = documentStore.openSession();
        for (const id of ids) {
            await session.store(new Item(), id);
        }
        await session.saveChanges();
    }

    function ids(prefix: string, count: number) {
        return Array.from({ length: count }, (_, i) => prefix + i);
    }

    it("canShardByDocumentsPrefix", async () => {
        store = await getShardedStore([
            { prefix: "eu/", shards: [0] },
            { prefix: "asia/", shards: [1, 2] }
        ]);

        const sharding = await getShardingConfiguration(store);
        assertThat(sharding.bucketRanges).hasSize(6);

        assertThat(prefixedWithRanges(sharding)[0].bucketRangeStart).isEqualTo(NUMBER_OF_BUCKETS);
        assertThat(sharding.bucketRanges[3].shardNumber).isEqualTo(0);
        assertThat(sharding.bucketRanges[3].bucketRangeStart).isEqualTo(NUMBER_OF_BUCKETS);

        assertThat(prefixedWithRanges(sharding)[1].bucketRangeStart).isEqualTo(NUMBER_OF_BUCKETS * 2);
        assertThat(sharding.bucketRanges[4].shardNumber).isEqualTo(1);
        assertThat(sharding.bucketRanges[4].bucketRangeStart).isEqualTo(NUMBER_OF_BUCKETS * 2);
        assertThat(sharding.bucketRanges[5].shardNumber).isEqualTo(2);
        assertThat(sharding.bucketRanges[5].bucketRangeStart).isEqualTo(NUMBER_OF_BUCKETS * 2.5);

        await storeItems(store, [
            ...ids("eu/items/", 40),
            ...ids("asia/items/", 40),
            ...ids("us/items/", 40),
            ...ids("items/", 40)
        ]);

        assertThat(await countStartingWith(store, 0, "eu/")).isEqualTo(40);
        assertThat(await countStartingWith(store, 0, "asia/")).isEqualTo(0);

        for (const shard of [1, 2]) {
            assertThat(await countStartingWith(store, shard, "eu/")).isEqualTo(0);
            assertThat(await countStartingWith(store, shard, "asia/")).isGreaterThan(0);
        }
        assertThat(await countStartingWith(store, 1, "asia/") + await countStartingWith(store, 2, "asia/")).isEqualTo(40);

        for (const prefix of ["us/", "items/"]) {
            let total = 0;
            for (const shard of [0, 1, 2]) {
                total += await countStartingWith(store, shard, prefix);
            }
            assertThat(total).isEqualTo(40);
        }
    });

    it("shouldThrowOnAttemptToAddPrefixThatDoesntEndWithSlashOrComma", async () => {
        store = await getShardedStore();

        await assertThrows(
            () => store.maintenance.send(new AddPrefixedShardingSettingOperation({ prefix: "asia", shards: [1, 2] })),
            err => assertThat(err.message).contains(
                "Cannot add prefix 'asia' to ShardingConfiguration.Prefixed. In order to define sharding by prefix, the prefix string must end with '/' or '-' characters"));
    });

    it("shouldThrowOnPrefixSettingWithNoShards", async () => {
        store = await getShardedStore();

        await assertThrows(
            () => store.maintenance.send(new AddPrefixedShardingSettingOperation({ prefix: "users/", shards: [] })),
            err => assertThat(err.name).isNotEqualTo("AssertionError"));

        await store.maintenance.send(new AddPrefixedShardingSettingOperation({ prefix: "users/", shards: [0] }));

        await assertThrows(
            () => getShardedStore([{ prefix: "users/", shards: [] }]),
            err => assertThat(err.name).isNotEqualTo("AssertionError"));
    });

    it("shouldNotAllowToAddPrefixIfWeHaveDocsStartingWith", async () => {
        store = await getShardedStore([{ prefix: "eu/", shards: [0] }]);
        await storeItems(store, ids("asia/items/", 10));

        await assertThrows(
            () => store.maintenance.send(new AddPrefixedShardingSettingOperation({ prefix: "asia/", shards: [1, 2] })),
            err => assertThat(err.message).contains(
                `Cannot add prefix 'asia/' to ShardingConfiguration.Prefixed. There are existing documents in database '${store.database}' that start with 'asia/'`));
    });

    it("shouldNotAllowToDeletePrefixIfWeHaveDocsStartingWith", async () => {
        store = await getShardedStore([
            { prefix: "asia/", shards: [0] },
            { prefix: "eu/", shards: [1, 2] }
        ]);
        await storeItems(store, ids("asia/items/", 10));

        await assertThrows(
            () => store.maintenance.send(new DeletePrefixedShardingSettingOperation("asia/")),
            err => assertThat(err.message).contains(
                `Cannot remove prefix 'asia/' from ShardingConfiguration.Prefixed. There are existing documents in database '${store.database}' that start with 'asia/'`));
    });

    it("canAddPrefixIfNoDocsStartingWith", async () => {
        store = await getShardedStore([{ prefix: "eu/", shards: [0] }]);
        await storeItems(store, ids("eu/items/", 10));

        let sharding = await getShardingConfiguration(store);
        assertThat(sharding.bucketRanges).hasSize(4);

        await store.maintenance.send(new AddPrefixedShardingSettingOperation({ prefix: "asia/", shards: [1, 2] }));

        sharding = await getShardingConfiguration(store);
        assertThat(sharding.prefixed).hasSize(2);
        assertThat(prefixedWithRanges(sharding)[1].bucketRangeStart).isEqualTo(NUMBER_OF_BUCKETS * 2);
        assertThat(sharding.bucketRanges).hasSize(6);

        const newStore = await getShardedStore();
        try {
            await newStore.maintenance.send(new AddPrefixedShardingSettingOperation({ prefix: "users/", shards: [0, 2] }));
            assertThat((await getShardingConfiguration(newStore)).prefixed).hasSize(1);
        } finally {
            await disposeTestDocumentStore(newStore);
        }
    });

    it("canDeletePrefixIfNoDocsStartingWith", async () => {
        store = await getShardedStore([{ prefix: "eu/", shards: [0, 1] }]);
        await storeItems(store, ids("asia/items/", 10));

        let sharding = await getShardingConfiguration(store);
        assertThat(sharding.bucketRanges).hasSize(5);

        await store.maintenance.send(new DeletePrefixedShardingSettingOperation("eu/"));

        sharding = await getShardingConfiguration(store);
        assertThat(sharding.prefixed).hasSize(0);
        assertThat(sharding.bucketRanges).hasSize(3);
    });

    it("canDeleteOnePrefixThenAddAnotherIfNoDocsStartingWith", async () => {
        store = await getShardedStore([
            { prefix: "eu/", shards: [0, 1] },
            { prefix: "us/", shards: [1, 2] }
        ]);
        await storeItems(store, ids("asia/items/", 10));

        let sharding = await getShardingConfiguration(store);
        assertThat(sharding.bucketRanges).hasSize(7);

        await store.maintenance.send(new DeletePrefixedShardingSettingOperation("eu/"));

        sharding = await getShardingConfiguration(store);
        assertThat(sharding.prefixed).hasSize(1);
        assertThat(sharding.bucketRanges).hasSize(5);

        await store.maintenance.send(new AddPrefixedShardingSettingOperation({ prefix: "africa/", shards: [0, 2] }));

        sharding = await getShardingConfiguration(store);
        assertThat(sharding.prefixed).hasSize(2);
        assertThat(sharding.bucketRanges).hasSize(7);
        assert.deepStrictEqual(sharding.bucketRanges.slice(3).map(r => r.bucketRangeStart), [
            NUMBER_OF_BUCKETS,
            NUMBER_OF_BUCKETS * 1.5,
            NUMBER_OF_BUCKETS * 2,
            NUMBER_OF_BUCKETS * 2.5
        ]);
    });

    it("canUpdatePrefixSetting", async () => {
        store = await getShardedStore([
            { prefix: "eu/", shards: [0, 1] },
            { prefix: "us/", shards: [1, 2] }
        ]);
        await storeItems(store, ids("eu/users/", 10));

        let sharding = await getShardingConfiguration(store);
        const bucketRanges = sharding.bucketRanges;
        assertThat(bucketRanges).hasSize(7);
        assert.deepStrictEqual(bucketRanges.slice(3).map(r => r.bucketRangeStart), [
            NUMBER_OF_BUCKETS,
            NUMBER_OF_BUCKETS * 1.5,
            NUMBER_OF_BUCKETS * 2,
            NUMBER_OF_BUCKETS * 2.5
        ]);

        await store.maintenance.send(new UpdatePrefixedShardingSettingOperation({ prefix: "eu/", shards: [0, 1, 2] }));

        sharding = await getShardingConfiguration(store);
        assertThat(sharding.prefixed).hasSize(2);
        assertThat(sharding.prefixed[1].prefix).isEqualTo("eu/");
        assertThat(sharding.prefixed[1].shards).hasSize(3);

        // shard #2 gets no bucket ranges for the 'eu/' prefix
        assert.deepStrictEqual(sharding.bucketRanges, bucketRanges);

        // shard #1 still has bucket ranges of 'us/'
        await assertThrows(
            () => store.maintenance.send(new UpdatePrefixedShardingSettingOperation({ prefix: "us/", shards: [2] })),
            err => assertThat(err.name).isNotEqualTo("AssertionError"));
    });

    it("canHandlePrefixOfPrefix", async () => {
        store = await getShardedStore([
            { prefix: "users/", shards: [0] },
            { prefix: "users/us/utah/", shards: [1] },
            { prefix: "users/us/", shards: [2] }
        ]);
        await storeItems(store, ids("users/us/california/", 10));

        assertThat(await countStartingWith(store, 0, "users/us/")).isEqualTo(0);
        assertThat(await countStartingWith(store, 1, "users/us/")).isEqualTo(0);
        assertThat(await countStartingWith(store, 2, "users/us/")).isEqualTo(10);

        let sharding = await getShardingConfiguration(store);
        assert.deepStrictEqual(prefixedWithRanges(sharding).map(p => [p.prefix, p.bucketRangeStart]), [
            ["users/us/utah/", NUMBER_OF_BUCKETS],
            ["users/us/", NUMBER_OF_BUCKETS * 2],
            ["users/", NUMBER_OF_BUCKETS * 3]
        ]);

        const bucketRanges = sharding.bucketRanges;
        assertThat(bucketRanges).hasSize(6);
        assert.deepStrictEqual(bucketRanges.slice(3).map(r => r.bucketRangeStart), [
            NUMBER_OF_BUCKETS,
            NUMBER_OF_BUCKETS * 2,
            NUMBER_OF_BUCKETS * 3
        ]);

        await store.maintenance.send(new AddPrefixedShardingSettingOperation({ prefix: "users/us/arizona/", shards: [1] }));

        sharding = await getShardingConfiguration(store);
        assert.deepStrictEqual(prefixedWithRanges(sharding).map(p => [p.prefix, p.bucketRangeStart]), [
            ["users/us/utah/", NUMBER_OF_BUCKETS],
            ["users/us/arizona/", NUMBER_OF_BUCKETS * 4],
            ["users/us/", NUMBER_OF_BUCKETS * 2],
            ["users/", NUMBER_OF_BUCKETS * 3]
        ]);

        const newBucketRanges = sharding.bucketRanges;
        assertThat(newBucketRanges).hasSize(7);
        assert.deepStrictEqual(newBucketRanges.slice(0, 6), bucketRanges);
        assertThat(newBucketRanges[6].bucketRangeStart).isEqualTo(NUMBER_OF_BUCKETS * 4);
        assertThat(newBucketRanges[6].shardNumber).isEqualTo(1);

        await storeItems(store, ids("users/us/arizona/", 10));

        assertThat(await countStartingWith(store, 0, "users/us/arizona/")).isEqualTo(0);
        assertThat(await countStartingWith(store, 1, "users/us/arizona/")).isEqualTo(10);
        assertThat(await countStartingWith(store, 2, "users/us/arizona/")).isEqualTo(0);
    });

    it("prefixesOperationsShouldBeCaseInsensitive", async () => {
        store = await getShardedStore([
            { prefix: "Users/", shards: [0, 1] },
            { prefix: "Companies/", shards: [0, 1, 2] }
        ]);

        await store.maintenance.send(new UpdatePrefixedShardingSettingOperation({ prefix: "users/", shards: [0, 1, 2] }));

        let sharding = await getShardingConfiguration(store);
        assertThat(sharding.prefixed).hasSize(2);
        assertThat(sharding.prefixed[0].prefix).isEqualTo("Users/");
        assert.deepStrictEqual(sharding.prefixed[0].shards, [0, 1, 2]);

        await store.maintenance.send(new DeletePrefixedShardingSettingOperation("COMPANIES/"));

        sharding = await getShardingConfiguration(store);
        assertThat(sharding.prefixed).hasSize(1);

        await store.maintenance.send(new AddPrefixedShardingSettingOperation({ prefix: "products/", shards: [2] }));
        await storeItems(store, ids("Products/", 10));

        assertThat(await countStartingWith(store, 0, "PRODUCTS/")).isEqualTo(0);
        assertThat(await countStartingWith(store, 1, "PRODUCTS/")).isEqualTo(0);
        assertThat(await countStartingWith(store, 2, "PRODUCTS/")).isEqualTo(10);

        await assertThrows(
            () => store.maintenance.send(new UpdatePrefixedShardingSettingOperation({ prefix: "Products/", shards: [1] })),
            err => assertThat(err.name).isNotEqualTo("AssertionError"));
    });

    it("whenAddingNewPrefixShouldFillBucketRangeGaps", async () => {
        store = await getShardedStore([
            { prefix: "users/a/", shards: [0] },
            { prefix: "users/b/", shards: [1] },
            { prefix: "users/c/", shards: [0, 1] },
            { prefix: "users/d/", shards: [0, 1, 2] }
        ]);

        const prefixesWithRanges = async () =>
            prefixedWithRanges(await getShardingConfiguration(store)).map(p => [p.prefix, p.bucketRangeStart]);

        assert.deepStrictEqual(await prefixesWithRanges(), [
            ["users/d/", NUMBER_OF_BUCKETS],
            ["users/c/", NUMBER_OF_BUCKETS * 2],
            ["users/b/", NUMBER_OF_BUCKETS * 3],
            ["users/a/", NUMBER_OF_BUCKETS * 4]
        ]);

        await store.maintenance.send(new DeletePrefixedShardingSettingOperation("users/c/"));

        assert.deepStrictEqual(await prefixesWithRanges(), [
            ["users/d/", NUMBER_OF_BUCKETS],
            ["users/b/", NUMBER_OF_BUCKETS * 3],
            ["users/a/", NUMBER_OF_BUCKETS * 4]
        ]);

        await store.maintenance.send(new AddPrefixedShardingSettingOperation({ prefix: "users/z/", shards: [1, 2] }));

        assert.deepStrictEqual(await prefixesWithRanges(), [
            ["users/z/", NUMBER_OF_BUCKETS * 2],
            ["users/d/", NUMBER_OF_BUCKETS],
            ["users/b/", NUMBER_OF_BUCKETS * 3],
            ["users/a/", NUMBER_OF_BUCKETS * 4]
        ]);
    });

    it("deletingPrefixAfterShardsDistributionHasBeenUpdated", async () => {
        store = await getShardedStore([{ prefix: "users/", shards: [0] }]);
        assertThat((await getShardingConfiguration(store)).bucketRanges).hasSize(4);

        await store.maintenance.send(new UpdatePrefixedShardingSettingOperation({ prefix: "users/", shards: [0, 1, 2] }));
        assertThat((await getShardingConfiguration(store)).bucketRanges).hasSize(4);

        await store.maintenance.send(new DeletePrefixedShardingSettingOperation("users/"));
        assertThat((await getShardingConfiguration(store)).bucketRanges).hasSize(3);
    });

    it("prefixedSharding_CanQueryWithSpecifiedShardContext", async () => {
        store = await getShardedStore([
            { prefix: "users/us/", shards: [0] },
            { prefix: "users/eu/", shards: [1] },
            { prefix: "users/asia/", shards: [2] }
        ]);
        await storeUsers(store);

        const session = store.openSession();

        const results = await session.query(User)
            .shardContext(s => s.byDocumentId("users/us/1"))
            .all();
        assertThat(results).hasSize(3);

        const results2 = await session.query(User)
            .shardContext(s => s.byDocumentIds(["users/us/1", "users/eu/1"]))
            .selectFields<string>("id")
            .all();
        assert.deepStrictEqual(results2.sort(), ["users/eu/1", "users/eu/2", "users/us/1", "users/us/2", "users/us/3"]);

        const results3 = await session.query(User)
            .shardContext(s => s.byDocumentId("users/asia/1"))
            .all();
        assertThat(results3).hasSize(4);
    });

    it("prefixesShouldGetPrecedenceOverAnchoring", async () => {
        const companyId = "companies/1";
        const relatedDocId = "products/1$" + companyId;
        const productsShard = 0;

        store = await getShardedStore([{ prefix: "products/", shards: [productsShard] }]);

        {
            const session = store.openSession();
            await session.store(new Company(), companyId);
            await session.saveChanges();
        }

        let companyShardNumber: number;
        for (const shard of [0, 1, 2]) {
            if (await shardSession(store, shard).load(companyId)) {
                companyShardNumber = shard;
            }
        }
        assertThat(companyShardNumber).isEqualTo(1);

        {
            const session = store.openSession();
            await session.store(new Product(), relatedDocId);
            await session.saveChanges();
        }

        assertThat(await shardSession(store, companyShardNumber).query(Product).firstOrNull()).isNull();
        assertThat(await shardSession(store, productsShard).query(Product).firstOrNull()).isNotNull();
    });

    it("preventAddingSamePrefixWithDifferentCasing", async () => {
        store = await getShardedStore([{ prefix: "users/us/", shards: [0] }]);

        await assertThrows(
            () => store.maintenance.send(new AddPrefixedShardingSettingOperation({ prefix: "users/US/", shards: [1] })),
            err => assertThat(err.message).contains("Prefix 'users/US/' already exists"));
    });

    it("preventCreatingDatabaseWithSamePrefixInDifferentCasing", async () => {
        await assertThrows(
            () => getShardedStore([
                { prefix: "users/us/", shards: [0] },
                { prefix: "users/US/", shards: [0] }
            ]),
            err => assertThat(err.message).contains("Prefix 'users/us/' already exists in different casing"));
    });

    it("canQueryByPrefix", async () => {
        store = await getShardedStore([
            { prefix: "users/us/", shards: [0] },
            { prefix: "users/eu/", shards: [1] },
            { prefix: "users/asia/", shards: [2] }
        ]);
        await storeUsers(store);

        const session = store.openSession();

        assertThat(await session.query(User).shardContext(s => s.byPrefix("users/us/")).all()).hasSize(3);
        assertThat(await session.query(User).shardContext(s => s.byPrefix("users/eu/")).all()).hasSize(2);
        assertThat(await session.query(User).shardContext(s => s.byPrefix("users/asia/")).all()).hasSize(4);
        assertThat(await session.query(User).shardContext(s => s.byDocumentId("users/asia/")).all()).hasSize(4);
    });

    it("canQueryByPrefix_WithPrefixedDocsSpreadAcrossMultipleShards", async () => {
        store = await getShardedStore([
            { prefix: "orders/", shards: [0, 1] },
            { prefix: "products/", shards: [1] },
            { prefix: "companies/", shards: [2] }
        ]);

        {
            const session = store.openSession();
            for (let i = 0; i < 100; i++) {
                await session.store(new Order(), "orders/" + i);
            }
            await session.store(new Product(), "products/1");
            await session.store(new Product(), "products/2");
            await session.store(new Company(), "companies/1");
            await session.store(new User(), "users/ayende");
            await session.saveChanges();
        }

        const session = store.openSession();
        assertThat(await session.query(Order).shardContext(s => s.byPrefix("orders/")).all()).hasSize(100);
        assertThat(await session.query(Product).shardContext(s => s.byPrefix("Products/")).all()).hasSize(2);
        assertThat(await session.query(Company).shardContext(s => s.byDocumentId("COMPANIES/")).all()).hasSize(1);

        const ordersInShard1 = await shardSession(store, 1).query(Order).count();
        assertThat(ordersInShard1).isGreaterThan(0);

        // all 'products/' docs live on shard #1, so only its orders are returned
        assertThat(await session.query(Order).shardContext(s => s.byPrefix("products/")).all()).hasSize(ordersInShard1);
    });

    it("queryByPrefix_ShouldThrowOnNonExistingPrefix", async () => {
        store = await getShardedStore([
            { prefix: "orders/", shards: [0] },
            { prefix: "products/", shards: [1] },
            { prefix: "companies/", shards: [2] }
        ]);

        {
            const session = store.openSession();
            await session.store(new Order(), "orders/1");
            await session.store(new Product(), "products/1");
            await session.store(new Company(), "companies/1");
            await session.store(new User(), "users/1");
            await session.saveChanges();
        }

        await assertThrows(
            () => store.openSession().query({ collection: "@all_docs" }).shardContext(s => s.byPrefix("users/")).all(),
            err => assertThat(err.message).contains("Prefix 'users/' wasn't found in Sharding Configuration"));
    });

    it("canQueryByPrefix_Raw", async () => {
        store = await getShardedStore([{ prefix: "users/", shards: [1] }]);

        {
            const session = store.openSession();
            for (let i = 0; i < 10; i++) {
                await session.store(new User(), "users/" + i);
                await session.store(new Order(), "orders/" + i);
                await session.store(new Company(), "companies/" + i);
                await session.store(new Product(), "products/" + i);
            }
            await session.saveChanges();
        }

        const docsInShard1 = await shardSession(store, 1).advanced.rawQuery("from @all_docs").count();
        assertThat(docsInShard1).isGreaterThan(0);

        const shardContext = { Prefixes: ["users/"] };
        const session = store.openSession();

        const allDocs = await session.advanced.rawQuery("from @all_docs")
            .addParameter(CONSTANTS.Documents.Querying.SHARD_CONTEXT_PARAMETER_NAME, shardContext)
            .all();
        assertThat(allDocs).hasSize(docsInShard1);

        const users = await session.advanced.rawQuery("from Users")
            .addParameter(CONSTANTS.Documents.Querying.SHARD_CONTEXT_PARAMETER_NAME, shardContext)
            .all();
        assertThat(users).hasSize(10);
    });

    it("canQueryByMultiplePrefixes", async () => {
        store = await getShardedStore([
            { prefix: "users/asia/", shards: [0] },
            { prefix: "users/eu/", shards: [1] },
            { prefix: "users/us/", shards: [2] }
        ]);
        await storeUsers(store);

        const results = await store.openSession().query(User)
            .shardContext(s => s.byPrefixes(["users/us/", "users/eu/"]))
            .orderBy("id()")
            .all();

        assert.deepStrictEqual(results.map(u => u.id), ["users/eu/1", "users/eu/2", "users/us/1", "users/us/2", "users/us/3"]);
    });

    it("canCombineDocumentIdsAndPrefixes", async () => {
        store = await getShardedStore([
            { prefix: "users/us/", shards: [0] },
            { prefix: "users/eu/", shards: [1] },
            { prefix: "users/asia/", shards: [2] }
        ]);
        await storeUsers(store);

        const results = await store.openSession().query(User)
            .shardContext(s => s.byPrefix("users/us/").byDocumentId("users/eu/1"))
            .all();

        assertThat(results).hasSize(5);
    });

    async function storeUsers(documentStore: IDocumentStore) {
        const session = documentStore.openSession();
        for (const id of [
            "users/us/1", "users/us/2", "users/us/3",
            "users/eu/1", "users/eu/2",
            "users/asia/1", "users/asia/2", "users/asia/3", "users/asia/4"]) {
            await session.store(new User(), id);
        }
        await session.saveChanges();
    }
});
