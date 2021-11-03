import * as sinon from "sinon";
import { User, GeekPerson } from "../Assets/Entities";
import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil";

import {
    IDocumentStore,
} from "../../src";
import { ReleaseCacheItem } from "../../src/Http/HttpCache";
import { assertThat } from "../Utils/AssertExtensions";

describe("LoadTest - ported", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("load() can use cache", async () => {

        let cacheGetSpy =
            store.getRequestExecutor().cache.get = sinon.spy(store.getRequestExecutor().cache, "get");
        let cacheSetSpy =
            store.getRequestExecutor().cache.set = sinon.spy(store.getRequestExecutor().cache, "set");

        {
            const session = store.openSession();
            const user = Object.assign(new User(), { name: "RavenDB" });

            await session.store(user, "users/1");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const user = await session.load<User>("users/1");
            assert.ok(user);
        }

        assert.ok(cacheSetSpy.getCalls().length);

        {
            const session = store.openSession();
            const user = await session.load<User>("users/1");
            assert.ok(user);
        }

        const cacheReads = cacheGetSpy.getCalls();
        const docReads = cacheReads.filter(x =>
            x.args[0] === store.urls[0] + `/databases/${store.database}/docs?&id=users%2F1`);

        assert.strictEqual(docReads.length, 2);
        assert.ok((docReads[1].returnValue as ReleaseCacheItem).item);
        assert.ok((docReads[1].returnValue as ReleaseCacheItem).item.payload);

        cacheGetSpy = null;
        cacheSetSpy = null;
    });

    it("load_Document_And_Expect_Null_User", async function () {
        {
            const session = store.openSession();
            let nullId: string;
            const user1 = await session.load(nullId, User);
            assertThat(user1)
                .isNull();

            const user2 = await session.load("", User);
            assertThat(user2)
                .isNull();

            const user3 = await session.load(" ", User);
            assertThat(user3)
                .isNull();
        }
    });

    it("can load document by id", async () => {
        {
            const session = store.openSession();
            const user = Object.assign(new User(), { name: "RavenDB" });

            await session.store(user, "users/1");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const user = await session.load<User>("users/1");
            assert.ok(user);
            assert.strictEqual(user.name, "RavenDB");
        }
    });

    it("loads multiple documents by ids", async () => {
        {
            const session = store.openSession();
            const user = Object.assign(new User(), { name: "RavenDB" });
            const user2 = Object.assign(new User(), { name: "Hibernating Rhinos" });

            await session.store(user, "users/1");
            await session.store(user2, "users/2");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const users = await session.load(["users/1", "users/2"]);
            assert.strictEqual(Object.keys(users).length, 2);
        }
    });

    it("load(null) returns null", async () => {
        {
            const session = store.openSession();
            const user = Object.assign(new User(), { name: "RavenDB" });
            const user2 = Object.assign(new User(), { name: "Hibernating Rhinos" });

            await session.store(user, "users/1");
            await session.store(user2, "users/2");
            await session.saveChanges();
        }
        {
            const session = store.openSession();
            const user = await session.load(null);
            assert.ok(!user);
        }

    });

    it("for multiple ids with null returns docs only for non-nulls", async () => {
        {
            const session = store.openSession();
            const user = Object.assign(new User(), { name: "RavenDB" });
            const user2 = Object.assign(new User(), { name: "Hibernating Rhinos" });

            await session.store(user, "users/1");
            await session.store(user2, "users/2");
            await session.saveChanges();
        }
        {
            const session = store.openSession();
            const users = await session.load<User>([
                "users/1", null, "users/2", null
            ]);
            assert.ok(users);
            assert.strictEqual(Object.keys(users).length, 2);

            assert.ok(users["users/1"]);
            assert.ok(users["users/2"]);
        }

    });

    it("load document with number arrays", async () => {
        {
            const session = store.openSession();
            const geek1 = Object.assign(new GeekPerson(), {
                name: "Bebop",
                favoritePrimes: [13, 43, 443, 997],
                favoriteVeryLargePrimes: [
                    5000000029, 5000000039
                ]
            });

            await session.store(geek1, "geeks/1");

            const geek2 = Object.assign(new GeekPerson(), {
                name: "Rocksteady",
                favoritePrimes: [2, 3, 5, 7],
                favoriteVeryLargePrimes: [999999999989]
            });

            await session.store(geek2, "geeks/2");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const geek1 = await session.load<GeekPerson>("geeks/1");
            const geek2 = await session.load<GeekPerson>("geeks/2");

            assert.strictEqual(geek1.favoritePrimes[1], 43);
            assert.strictEqual(geek1.favoriteVeryLargePrimes[1], 5000000039);

            assert.strictEqual(geek2.favoritePrimes[3], 7);
            assert.strictEqual(geek2.favoriteVeryLargePrimes[0], 999999999989);
        }
    });

    it("should load many ids as POST", async () => {
        const ids = [];
        {
            const session = store.openSession();

            // Length of all the ids together should be larger than 1024 for POST request
            for (let i = 0; i < 200; i++) {
                const id = "users/" + i;
                ids.push(id);

                const user = new User();
                user.name = "Person " + i;
                await session.store(user, id);
            }

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const users = await session.load<User>(ids);
            const user77 = users["users/77"];
            assert.ok(user77);
            assert.strictEqual(user77.id, "users/77");
            assert.strictEqual(user77.name, "Person 77");
        }
    });

    it("can load starts with", async () => {
        {
            const session = store.openSession();
            const createUser = async (id) => {
                await session.store(new User(), id);
            };

            await createUser("Aaa");
            await createUser("Abc");
            await createUser("Afa");
            await createUser("Ala");
            await createUser("Baa");

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const users = await session.advanced.loadStartingWith<User>("A");

            assert.deepStrictEqual(users.map(x => x.id), ["Aaa", "Abc", "Afa", "Ala"]);

            const users2 = await session.advanced.loadStartingWith<User>("A", {
                start: 1,
                pageSize: 2
            });

            assert.deepStrictEqual(users2.map(x => x.id), ["Abc", "Afa"]);
        }
    });
});
