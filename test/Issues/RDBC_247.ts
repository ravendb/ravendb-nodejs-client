import * as mocha from "mocha";
import * as assert from "assert";
import { User, Company, Order } from "../Assets/Entities";
import { assertThrows } from "../Utils/AssertExtensions";
import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil";

import {
    RavenErrorType,
    IDocumentStore,
    IDocumentSession,
} from "../../src";

describe("RDBC-247", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    beforeEach(async () => {
        const session = store.openSession();
        await session.store(Object.assign(new User(), { name: "John" }));
        await session.store(Object.assign(new User(), { name: "John2" }));
        await session.store(Object.assign(new User(), { name: "John3" }));
        await session.store(Object.assign(new User(), { name: "John4" }));
        await session.saveChanges();
    });

    let session: IDocumentSession;

    beforeEach(() => session = store.openSession());

    describe("single()", function () {

        it("should throw if 0 results", async function () {
            await assertThrows(
                async () => await session.query({ collection: "users" })
                    .whereEquals("name", "Merry")
                    .single(),
                err => {
                    assert.strictEqual(err.name, "InvalidOperationException");
                    assert.strictEqual(err.message, "Expected single result, but got 0.");
                });
        });

        it("should throw if more than 1 result", async function() {
            await assertThrows(
                async () => await session.query({ collection: "users" }).single(),
                err => {
                    assert.strictEqual(err.name, "InvalidOperationException");
                    assert.strictEqual(err.message, "Expected single result, but got more than that.");
                });
        
        });

        it("should return exactly 1 result", async function() {
            const result = await session.query<User>({ collection: "users" })
                .whereEquals("name", "John")
                .single();

            assert.ok(result);
            assert.ok(result instanceof User);
            assert.strictEqual(result.name, "John");
        });

    });

    describe("singleOrNull()", function () {

        it("should return null if 0 results", async function () {
            const result = await session.query<User>({ collection: "users" })
                .whereEquals("name", "Merry")
                .singleOrNull();
            assert.strictEqual(result, null);
        });

        it("should return null if more than 1 result", async function() {
            const result = await session.query<User>({ collection: "users" })
                .singleOrNull();
            assert.strictEqual(result, null);
        });

        it("should return exactly 1 result", async function() {
            const result = await session.query<User>({ collection: "users" })
                .whereEquals("name", "John")
                .singleOrNull();

            assert.ok(result);
            assert.ok(result instanceof User);
            assert.strictEqual(result.name, "John");
        });

    });

    describe("first()", function () {

        it("should return first result", async function() {
            const result = await session.query<User>({ collection: "users" })
                .whereStartsWith("name", "John")
                .orderBy("name")
                .first();

            assert.ok(result);
            assert.ok(result instanceof User);
            assert.strictEqual(result.name, "John");
        });

        it("should throw for no results", async function() {
            await assertThrows(
                async () => await session.query({ collection: "users" })
                    .whereEquals("name", "Merry")
                    .first(),
                err => {
                    assert.strictEqual(err.name, "InvalidOperationException");
                    assert.strictEqual(err.message, "Expected at least one result.");
                });
        });

    });

    describe("firstOrNull()", function () {

        it("should return first result", async function() {
            const result = await session.query<User>({ collection: "users" })
                .whereStartsWith("name", "John")
                .orderBy("name")
                .firstOrNull();

            assert.ok(result);
            assert.ok(result instanceof User);
            assert.strictEqual(result.name, "John");
        });

        it("should return null for no results", async function() {
            const result = await session.query<User>({ collection: "users" })
                .whereStartsWith("name", "Merry")
                .firstOrNull();

            assert.strictEqual(result, null);
        });

    });

});
