import assert from "node:assert"
import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil.js";

import {
    IDocumentStore,
    GetDocumentsCommand,
    DocumentStore
} from "../../src/index.js";
import { User } from "../Assets/Entities.js";

class Family {
    public names: string[];
}

class Poc {
    public name: string;
    public obj: object;
}

describe("CRUD tests", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("saves entities using lowercase", async () => {
        const session = store.openSession();
        const user1 = Object.assign(new User(), { lastName: "user1" });
        await session.store(user1, "users/1");
        await session.saveChanges();

        const documentsCommand = new GetDocumentsCommand({
            id: "users/1",
            includes: null,
            metadataOnly: false,
            conventions: store.conventions
        });

        await store.getRequestExecutor().execute(documentsCommand);

        const { result } = documentsCommand;
        const userJson = result.results[0];

        assert.ok(Object.keys(userJson).includes("lastName"));

        {
            const newSession = store.openSession();
            const users = await newSession.advanced
                .rawQuery("from Users where lastName = 'user1'", User)
                .all();
            assert.strictEqual(users.length, 1);
        }
    });

    for (const useCompression of [true, false]) {
        it(`CRUD operations (useCompression: ${useCompression})`, async () => {
            let compressionStore: DocumentStore;
            testContext.customizeStore = async s => {
                s.conventions.useHttpCompression = useCompression;
                s.conventions.useHttpDecompression = useCompression;
            };
            try {
                compressionStore = await testContext.getDocumentStore();
            } finally {
                testContext.customizeStore = null;
            }

            try {
                const newSession = compressionStore.openSession();
                await newSession.store(Object.assign(new User(), { name: "user1" }), "users/1");
                const user2 = Object.assign(new User(), { name: "user2", age: 1 });
                await newSession.store(user2, "users/2");
                const user3 = Object.assign(new User(), { name: "user3", age: 1 });
                await newSession.store(user3, "users/3");
                await newSession.store(Object.assign(new User(), { name: "user4" }), "users/4");

                newSession.delete(user2);
                user3.age = 3;
                await newSession.saveChanges();

                let tempUser = await newSession.load("users/2", User);
                assert.strictEqual(tempUser, null);
                tempUser = await newSession.load("users/3", User);
                assert.strictEqual(tempUser.age, 3);
                const user1 = await newSession.load("users/1", User);
                const user4 = await newSession.load("users/4", User);

                newSession.delete(user4);
                user1.age = 10;
                await newSession.saveChanges();

                tempUser = await newSession.load("users/4", User);
                assert.strictEqual(tempUser, null);
                tempUser = await newSession.load("users/1", User);
                assert.strictEqual(tempUser.age, 10);
            } finally {
                await disposeTestDocumentStore(compressionStore);
            }
        });
    }

    it("CRUD operations with what changed", async () => {
        const newSession = store.openSession();
        await newSession.store(Object.assign(new User(), { name: "user1" }), "users/1");
        const user2 = Object.assign(new User(), { name: "user2", age: 1 });
        await newSession.store(user2, "users/2");
        const user3 = Object.assign(new User(), { name: "user3", age: 1 });
        await newSession.store(user3, "users/3");
        await newSession.store(Object.assign(new User(), { name: "user4" }), "users/4");

        newSession.delete(user2);
        user3.age = 3;

        assert.strictEqual(Object.keys(newSession.advanced.whatChanged()).length, 4);
        await newSession.saveChanges();

        let tempUser = await newSession.load("users/2", User);
        assert.strictEqual(tempUser, null);
        tempUser = await newSession.load("users/3", User);
        assert.strictEqual(tempUser.age, 3);
        const user1 = await newSession.load("users/1", User);
        const user4 = await newSession.load("users/4", User);

        newSession.delete(user4);
        user1.age = 10;
        assert.strictEqual(Object.keys(newSession.advanced.whatChanged()).length, 2);
        await newSession.saveChanges();

        tempUser = await newSession.load("users/4", User);
        assert.strictEqual(tempUser, null);
        tempUser = await newSession.load("users/1", User);
        assert.strictEqual(tempUser.age, 10);
    });

    it("CRUD operations with array in object 2", async () => {
        const newSession = store.openSession();
        const family = Object.assign(new Family(), { names: ["Hibernating Rhinos", "RavenDB"] });
        await newSession.store(family, "family/1");
        await newSession.saveChanges();

        const newFamily = await newSession.load("family/1", Family);
        newFamily.names = ["Hibernating Rhinos", "RavenDB"];
        assert.strictEqual(Object.keys(newSession.advanced.whatChanged()).length, 0);
        newFamily.names = ["RavenDB", "Hibernating Rhinos"];
        assert.strictEqual(Object.keys(newSession.advanced.whatChanged()).length, 1);
        await newSession.saveChanges();
    });

    it("CRUD operations with null", async () => {
        const newSession = store.openSession();
        await newSession.store(Object.assign(new User(), { name: null }), "users/1");
        await newSession.saveChanges();
        const user = await newSession.load("users/1", User);
        assert.strictEqual(Object.keys(newSession.advanced.whatChanged()).length, 0);
        user.age = 3;
        assert.strictEqual(Object.keys(newSession.advanced.whatChanged()).length, 1);
    });

    it("CRUD can update property to null", async () => {
        {
            const newSession = store.openSession();
            await newSession.store(Object.assign(new User(), { name: "user1" }), "users/1");
            await newSession.saveChanges();
        }

        {
            const newSession = store.openSession();
            const user = await newSession.load("users/1", User);
            user.name = null;
            await newSession.saveChanges();
        }

        const newSession = store.openSession();
        const user = await newSession.load("users/1", User);
        assert.strictEqual(user.name, null);
    });

    it("CRUD can update property from null to object", async () => {
        {
            const session = store.openSession();
            await session.store(Object.assign(new Poc(), { name: "aviv", obj: null }), "pocs/1");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const poc = await session.load("pocs/1", Poc);
            assert.strictEqual(poc.obj, null);

            poc.obj = { a: 1, b: "2" };
            await session.saveChanges();
        }

        const session = store.openSession();
        const poc = await session.load("pocs/1", Poc);
        assert.ok(poc.obj);
    });

    it("load when document not found should track", async () => {
        const notExistId1 = "notExistId1";
        const notExistId2 = "notExistId2";
        const user = new User();
        {
            const session = store.openSession();
            await session.store(user);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            await session.load(notExistId1, User);

            assert.ok(session.advanced.isLoaded(notExistId1));

            await session.load(notExistId1, User);
            assert.strictEqual(session.advanced.numberOfRequests, 1);
        }

        {
            const session = store.openSession();
            await session.load([notExistId1, notExistId2], User);

            assert.ok(session.advanced.isLoaded(notExistId1));
            assert.ok(session.advanced.isLoaded(notExistId2));

            await session.load([notExistId1, notExistId2], User);
            assert.strictEqual(session.advanced.numberOfRequests, 1);
        }

        {
            const session = store.openSession();
            await session.load([user.id, notExistId1], User);

            assert.ok(session.advanced.isLoaded(user.id));
            assert.ok(session.advanced.isLoaded(notExistId1));

            await session.load(notExistId1, User);
            assert.strictEqual(session.advanced.numberOfRequests, 1);
        }
    });
});
