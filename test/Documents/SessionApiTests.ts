import { User } from "../Assets/Entities";
import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil";

import {
    IDocumentStore,
    IDocumentSession,
} from "../../src";

describe("Session API dev experience tests", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    describe("store()", () => {

        let session: IDocumentSession;
        let user: User;

        beforeEach(() => {
            session = store.openSession();
            user = Object.assign(new User(), { name: "Jon" });
        });

        it("id and opts", async () => {
            await session.store(user, "users/1", { changeVector: "aaa" });
            assert.strictEqual(user.id, "users/1");
        });

        it("id and type", async () => {
            await session.store(user, "users/1", User);
            assert.strictEqual(user.id, "users/1");
        });

        it("only id", async () => {
            await session.store(user, "users/1");
            assert.strictEqual(user.id, "users/1");
        });

    });

    describe("saveChanges()", () => {

        let session: IDocumentSession;
        let user: User;

        beforeEach(async () => {
            session = store.openSession();
            user = Object.assign(new User(), { name: "Jon" });
            await session.store(user);
        });

        it("using promise", async () => {
            await session.saveChanges();
        });
    });

    describe("load()", () => {

        let session: IDocumentSession;
        let user: User;

        beforeEach(async () => {
            session = store.openSession();
            user = Object.assign(new User(), { name: "Jon" });
            await session.store(user);
            await session.saveChanges();

            session = store.openSession(); // open another session
        });

        function assertLoadResult(result) {
            assert.ok(result);
            assert.strictEqual(result.name, user.name);
        }

        describe("can use async/promises", () => {

            it("pass id", async () => {
                const result = await session.load(user.id);
                assertLoadResult(result);
            });

            it("pass id and type", async () => {
                const result = await session.load(user.id, User);
                assertLoadResult(result);
            });

            it("pass id and opts", async () => {
                const result = await session.load(user.id, { documentType: User });
                assertLoadResult(result);
            });

        });

    });

    describe("delete()", () => {
        // delete is synchronous
    });

    describe("using object literals", async () => {

        let session: IDocumentSession;

        it("CRUD + query", async () => {

            store.conventions.findCollectionNameForObjectLiteral =
                (e: any) => e.collection;

            const user: any = {
                collection: "Users",
                name: "John"
            };

            {
                session = store.openSession();
                await session.store(user);
                await session.saveChanges();
                assert.ok(user.id);
                assert.strictEqual(user.id, "users/1-A");
            }

            {
                session = store.openSession();
                const loaded: any = await session.load(user.id);
                assert.ok(loaded);
                assert.strictEqual(loaded.name, "John");
            }

            {
                session = store.openSession();
                const results = await session.query({ collection: "users" }).all();
                assert.strictEqual(results.length, 1);
                assert.strictEqual((results[0] as any).name, "John");

                const loaded: any = await session.load(user.id);
                await session.delete(loaded);
                await session.saveChanges();
            }
        });

        it("loads @metadata.Raven-Node-Type as null", async () => {
            store.conventions.findCollectionNameForObjectLiteral =
                (e: any) => e["collection"];

            {
                const user: any = {
                    collection: "Users",
                    name: "John"
                };
                const session = store.openSession();
                await session.store(user, "users/1");
                await session.saveChanges();
            }

            {
                const session = store.openSession();
                const loaded = await session.load("users/1");
                assert.strictEqual(loaded["@metadata"]["Raven-Node-Type"], null);
                assert.strictEqual(loaded["@metadata"]["@collection"], "Users");
            }

        });
    });

    describe("using classes", async () => {

        let session: IDocumentSession;

        it("CRUD + query", async () => {

            const user: User = Object.assign(new User(), { name: "John" });

            {
                session = store.openSession();
                await session.store(user);
                await session.saveChanges();
                assert.ok(user.id);
                assert.strictEqual(user.id, "users/1-A");
            }

            {
                session = store.openSession();
                const loaded: any = await session.load(user.id);
                assert.ok(loaded);
                assert.strictEqual(loaded.name, "John");
                assert.strictEqual(loaded.constructor, User);
            }

            {
                session = store.openSession();
                const results = await session.query({ collection: "users" }).all();
                assert.strictEqual(results.length, 1);
                assert.strictEqual((results[0] as any).name, "John");

                const loaded: any = await session.load(user.id);
                await session.delete(loaded);
                await session.saveChanges();
            }
        });

    });

    it("saveChanges() (instead of store()) sets id on entity for object literals with default collection name conventions", async () => {
        const session = store.openSession();
        const entity = { name: "test" };
        await session.store(entity);
        await session.saveChanges();
        assert.ok(entity["id"]);
    });

});
