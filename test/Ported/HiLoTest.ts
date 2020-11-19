import { User } from "../Assets/Entities";
import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil";

import {
    IDocumentStore,
    HiloIdGenerator,
    DocumentStore, MultiDatabaseHiLoIdGenerator,
} from "../../src";
import { ArrayUtil } from "../../src/Utility/ArrayUtil";

describe("HiLo", function () {

    class HiloDoc {
        // tslint:disable-next-line:variable-name
        public Max: number;
    }

    class Product {
        public productName: string;
    }

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("does not get another range, when doing parallel requests", async () => {
        const users = ArrayUtil.range(32, i => Object.assign(new User(), { name: "user" + i }));
        const storeOps = users.map(async x => {
            const session = store.openSession();
            await session.store(x);
            await session.saveChanges();
        });
        await Promise.all(storeOps);

        const userIds = users.map(x => x.id);
        assert.strictEqual(new Set(userIds).size, userIds.length, `Ids are not unique: ${userIds}`);

        userIds
            .map(id => id.split("/")[1])
            .forEach(numericPart => {
                assert.ok(parseInt(numericPart, 10) < 33,
                    "Obtained ids should be less than 33, though they are:" + users.map(x => x.id).toString());
            });

    });

    it("picks up where it left off", async () => {
        const store1 = await testContext.getDocumentStore("hilo_continues");
        try {
            const users = ArrayUtil.range(10, i => Object.assign(new User(), { name: "user" + i }));
            const storeOps = users.map(async x => {
                const session = store1.openSession();
                await session.store(x);
                await session.saveChanges();
            });
            await Promise.all(storeOps);
            await store1["_multiDbHiLo"].returnUnusedRange();

            const store2 = await testContext.getDocumentStore();
            try {
                const session = store2.openSession(store1.database);
                const newUser = Object.assign(new User(), { name: "new" });
                await session.store(newUser);
                await session.saveChanges();
                assert.strictEqual(newUser.id, "users/11-A");
            } finally {
                store2.dispose();
            }
        } finally {
            store1.dispose();
        }

    });

    it("cannot go down", async () => {
        const session = store.openSession();
        const hiloDoc: HiloDoc = Object.assign(new HiloDoc(), { Max: 32 });

        await session.store(hiloDoc, "Raven/Hilo/users");
        await session.saveChanges();

        const hiLoKeyGenerator = new HiloIdGenerator("users", store, store.database,"/");
        const ids = [];
        const firstNextId = await hiLoKeyGenerator.nextId();
        ids.push(firstNextId);

        hiloDoc.Max = 12;
        await session.store(hiloDoc, "Raven/Hilo/users", {
            changeVector: null
        });
        await session.saveChanges();
        for (let i = 0; i < 128; i++) {
            const nextId = await hiLoKeyGenerator.nextId();
            assert.ok(!ids.includes(nextId));
            ids.push(nextId);
        }

        assert.strictEqual(new Set(ids).size, ids.length);

    });

    it("can operate with multiple DBs", async () => {
        const session = store.openSession();
        const hiloDoc: HiloDoc = Object.assign(new HiloDoc(), { Max: 64 });

        await session.store(hiloDoc, "Raven/Hilo/users");

        const productsHilo = Object.assign(new HiloDoc(), { Max: 128 });
        await session.store(productsHilo, "Raven/Hilo/products");

        await session.saveChanges();

        const multiDbHilo = new MultiDatabaseHiLoIdGenerator(store as DocumentStore);
        let generatedDocumentKey = await multiDbHilo.generateDocumentId(null, new User());
        assert.strictEqual(generatedDocumentKey, "users/65-A");

        generatedDocumentKey = await multiDbHilo.generateDocumentId(null, new Product());
        assert.strictEqual(generatedDocumentKey, "products/129-A");
    });

    it("capacity should double", async () => {
        const hiLoIdGenerator = new HiloIdGenerator("users", store, store.database, "/");

        {
            const session = store.openSession();
            const hiloDoc: HiloDoc = Object.assign(new HiloDoc(), { Max: 64 });
            await session.store(hiloDoc, "Raven/Hilo/users");
            await session.saveChanges();

            for (let i = 0; i < 32; i++) {
                await hiLoIdGenerator.generateDocumentId(new User());
            }
        }

        {
            const session = store.openSession();
            const hiloDoc = await session.load<HiloDoc>("Raven/Hilo/users");
            assert.strictEqual(hiloDoc.Max, 96);
            assert.strictEqual(hiloDoc.constructor, HiloDoc); // should take type from @metadata

            await hiLoIdGenerator.generateDocumentId(new User());
        }

        {
            const session = store.openSession();
            const hiloDoc = await session.load<HiloDoc>("Raven/Hilo/users");
            assert.strictEqual(hiloDoc.Max, 160);
            assert.strictEqual(hiloDoc.constructor, HiloDoc);
        }
    });

    it("returns unused range on dispose", async () => {

        let newStore = new DocumentStore(store.urls, store.database);
        newStore.initialize();

        {
            const session = newStore.openSession();
            const hiloDoc: HiloDoc = Object.assign(new HiloDoc(), { Max: 32 });
            await session.store(hiloDoc, "Raven/Hilo/users");
            await session.saveChanges();

            await session.store(new User());
            await session.store(new User());
            await session.saveChanges();
        }

        async function waitForStoreDisposeFinish(store) {
            return new Promise((resolve) =>
                store.once("afterDispose", (handledCallback) => {
                    handledCallback(); 
                    resolve();
                }));
        }

        newStore.dispose(); // on document store dispose(), hilo-return should be called

        await waitForStoreDisposeFinish(newStore);

        newStore = new DocumentStore(store.urls, store.database);
        newStore.initialize();

        {
            const session = newStore.openSession();
            const hiloDoc = await session.load<HiloDoc>("Raven/Hilo/users", HiloDoc);
            assert.strictEqual(hiloDoc.Max, 34);
            assert.strictEqual(hiloDoc.constructor, HiloDoc); // should take type from @metadata
        }

        newStore.dispose();
    });

    it("does not get another range when doing parallel requests", async () => {
        const parallelLevel = 32;
        const users = Array.from(Array(parallelLevel).keys()).map(x => new User());

        const tasks = Array.from(Array(parallelLevel).keys()).map(async i => {
            const user = users[i];
            const session = store.openSession();
            await session.store(user);
            await session.saveChanges();
        });

        await Promise.all(tasks);

        users
            .map(x => x.id)
            .map(id => id.split("/")[1])
            .map(x => x.split("-")[0])
            .forEach(numericPart => {
                assert.ok(numericPart);
                assert.ok(parseInt(numericPart, 10) < 33);
            });
    });

    it("does get another range when gets over max and leaves no gaps", async () => {
        const parallelLevel = 40;
        const users = Array.from(Array(parallelLevel).keys()).map(x => new User());

        const tasks = Array.from(Array(parallelLevel).keys()).map(async i => {
            const user = users[i];
            const session = store.openSession();
            await session.store(user);
            await session.saveChanges();
        });

        await Promise.all(tasks);

        const idNumbers = users
            .map(x => x.id)
            .map(id => id.split("/")[1])
            .map(x => parseInt(x.split("-")[0], 10));
        
        assert.strictEqual(idNumbers.length, 40);

        idNumbers.sort((a, b) => a > b ? 1 : -1);

        for (let i = 1; i <= 40; i++) {
            assert.strictEqual(idNumbers[i - 1], i);
        }
    });
});
