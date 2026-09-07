import assert from "node:assert";
import {
    IDocumentStore,
    InMemoryDocumentSessionOperations,
    JsonPatchCommandData,
    JsonPatchDocument,
    SessionPatchBehavior
} from "../../../src/index.js";
import { CommandType } from "../../../src/Documents/Commands/CommandData.js";
import { IdTypeAndName } from "../../../src/Documents/IdTypeAndName.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions.js";

class Address {
    public city: string;
    public country: string;
}

class UserWithTags {
    public id: string;
    public name: string;
    public age: number;
    public tags: string[];
    public settings: Record<string, string>;
    public address: Address;
}

const USER_ID = "users/1";

describe("RavenDB-22293 JsonPatch session patching", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => {
        testContext.customizeStore = null;
        await disposeTestDocumentStore(store);
    });

    // A second store whose conventions were set before initialize() (conventions freeze on initialize)
    async function storeWithBehavior(behavior: SessionPatchBehavior): Promise<IDocumentStore> {
        testContext.customizeStore = async s => {
            s.conventions.sessionPatchBehavior = behavior;
        };
        try {
            return await testContext.getDocumentStore();
        } finally {
            testContext.customizeStore = null;
        }
    }

    async function storeUser(target: IDocumentStore, overrides: Partial<UserWithTags> = {}): Promise<void> {
        const session = target.openSession();
        const user = Object.assign(new UserWithTags(), {
            name: "Test",
            age: 25,
            tags: ["a", "b", "c"],
            settings: { theme: "light" },
            address: Object.assign(new Address(), { city: "OldCity", country: "US" })
        }, overrides);
        await session.store(user, USER_ID);
        await session.saveChanges();
    }

    async function loadUser(target: IDocumentStore): Promise<UserWithTags> {
        const session = target.openSession();
        return await session.load<UserWithTags>(USER_ID, UserWithTags);
    }

    function deferred(session: unknown): InMemoryDocumentSessionOperations {
        return session as InMemoryDocumentSessionOperations;
    }

    function hasDeferred(session: unknown, type: CommandType): boolean {
        return deferred(session).deferredCommandsMap.has(IdTypeAndName.keyFor(USER_ID, type, null));
    }

    it("deferred JsonPatchCommandData is applied and refreshes the tracked entity", async () => {
        await storeUser(store);

        const session = store.openSession();
        const user = await session.load<UserWithTags>(USER_ID, UserWithTags);
        const changeVectorBefore = session.advanced.getChangeVectorFor(user);

        session.advanced.defer(new JsonPatchCommandData(USER_ID, new JsonPatchDocument()
            .add("/name", "Updated")
            .replace("/tags/1", "B")
            .remove("/settings/theme")));
        await session.saveChanges();

        assert.strictEqual(user.name, "Updated");
        assert.deepStrictEqual(user.tags, ["a", "B", "c"]);
        assert.deepStrictEqual(user.settings, {});
        assert.notStrictEqual(session.advanced.getChangeVectorFor(user), changeVectorBefore);

        const reloaded = await loadUser(store);
        assert.strictEqual(reloaded.name, "Updated");
        assert.deepStrictEqual(reloaded.tags, ["a", "B", "c"]);
    });

    const behaviors: Array<[SessionPatchBehavior, CommandType]> = [
        ["JsonPatch", "JsonPatch"],
        ["JavaScript", "PATCH"]
    ];

    for (const [behavior, expectedType] of behaviors) {
        it(`patch() on a simple property uses ${expectedType} under ${behavior}`, async () => {
            const target = await storeWithBehavior(behavior);
            try {
                await storeUser(target);

                const session = target.openSession();
                session.advanced.patch(USER_ID, "name", "Updated");
                assert.strictEqual(hasDeferred(session, expectedType), true);
                await session.saveChanges();

                const user = await loadUser(target);
                assert.strictEqual(user.name, "Updated");
                assert.strictEqual(user.age, 25);
            } finally {
                await disposeTestDocumentStore(target);
            }
        });
    }

    it("sessionPatchBehavior defaults to JsonPatch", () => {
        assert.strictEqual(store.conventions.sessionPatchBehavior, "JsonPatch");
    });

    it("patch() on a nested property, null and number values uses JsonPatch", async () => {
        await storeUser(store);

        const session = store.openSession();
        session.advanced.patch(USER_ID, "address.city", "NewCity");
        session.advanced.patch(USER_ID, "name", null);
        session.advanced.patch(USER_ID, "age", 30);
        assert.strictEqual(hasDeferred(session, "JsonPatch"), true);
        assert.strictEqual(hasDeferred(session, "PATCH"), false);
        assert.strictEqual(deferred(session).deferredCommandsCount, 1); // merged into one command
        await session.saveChanges();

        const user = await loadUser(store);
        assert.strictEqual(user.address.city, "NewCity");
        assert.strictEqual(user.address.country, "US");
        assert.strictEqual(user.name, null);
        assert.strictEqual(user.age, 30);
    });

    it("patch() creates an absent property", async () => {
        const session = store.openSession();
        await session.store(Object.assign(new UserWithTags(), { name: "Test" }), USER_ID);
        await session.saveChanges();

        const patchSession = store.openSession();
        patchSession.advanced.patch(USER_ID, "age", 30);
        await patchSession.saveChanges();

        const user = await loadUser(store);
        assert.strictEqual(user.name, "Test");
        assert.strictEqual(user.age, 30);
    });

    it("patch() on an array element by index replaces in place", async () => {
        await storeUser(store);

        const session = store.openSession();
        session.advanced.patch(USER_ID, "tags[1]", "B");
        assert.strictEqual(hasDeferred(session, "JsonPatch"), true);
        await session.saveChanges();

        const user = await loadUser(store);
        assert.deepStrictEqual(user.tags, ["a", "B", "c"]); // replaced, not inserted
    });

    it("patch() falls back to JavaScript for object and Date values", async () => {
        await storeUser(store);

        const session = store.openSession();
        session.advanced.patch(USER_ID, "address", Object.assign(new Address(), { city: "X", country: "PL" }));
        session.advanced.patch(USER_ID, "lastLogin", new Date(2026, 0, 1));
        assert.strictEqual(hasDeferred(session, "PATCH"), true);
        assert.strictEqual(hasDeferred(session, "JsonPatch"), false);
        await session.saveChanges();

        const user = await loadUser(store);
        assert.strictEqual(user.address.city, "X");
        assert.strictEqual(user.address.country, "PL");
        assert.ok((user as any).lastLogin);
    });

    it("patch() falls back to JavaScript for paths that are not plain member/index chains", async () => {
        await storeUser(store);

        const session = store.openSession();
        session.advanced.patch(USER_ID, "tags[this.tags.length - 1]", "Z");
        assert.strictEqual(hasDeferred(session, "PATCH"), true);
        assert.strictEqual(hasDeferred(session, "JsonPatch"), false);
        await session.saveChanges();

        const user = await loadUser(store);
        assert.deepStrictEqual(user.tags, ["a", "b", "Z"]);
    });

    it("patch() after increment() joins the JavaScript patch", async () => {
        await storeUser(store);

        const session = store.openSession();
        session.advanced.increment(USER_ID, "age", 5);
        session.advanced.patch(USER_ID, "name", "Updated");
        assert.strictEqual(hasDeferred(session, "PATCH"), true);
        assert.strictEqual(hasDeferred(session, "JsonPatch"), false);
        assert.strictEqual(deferred(session).deferredCommandsCount, 1);
        await session.saveChanges();

        const user = await loadUser(store);
        assert.strictEqual(user.name, "Updated");
        assert.strictEqual(user.age, 30);
    });

    it("patch() then increment() keeps both commands", async () => {
        await storeUser(store);

        const session = store.openSession();
        session.advanced.patch(USER_ID, "age", 10);
        session.advanced.increment(USER_ID, "age", 5);
        assert.strictEqual(hasDeferred(session, "JsonPatch"), true);
        assert.strictEqual(hasDeferred(session, "PATCH"), true);
        assert.strictEqual(deferred(session).deferredCommandsCount, 2);
        await session.saveChanges();

        const user = await loadUser(store);
        assert.strictEqual(user.name, "Test");
        assert.strictEqual(user.age, 15); // JsonPatch set 10, then the JavaScript increment added 5
    });

    it("patch() on a tracked entity refreshes it after saveChanges", async () => {
        await storeUser(store);

        const session = store.openSession();
        const user = await session.load<UserWithTags>(USER_ID, UserWithTags);
        const changeVectorBefore = session.advanced.getChangeVectorFor(user);

        session.advanced.patch(user, "name", "Updated");
        assert.strictEqual(hasDeferred(session, "JsonPatch"), true);
        await session.saveChanges();

        assert.strictEqual(user.name, "Updated");
        assert.notStrictEqual(session.advanced.getChangeVectorFor(user), changeVectorBefore);
    });

    it("patch() does not send a change vector even with optimistic concurrency", async () => {
        await storeUser(store);

        const session = store.openSession();
        session.advanced.useOptimisticConcurrency = true;
        const user = await session.load<UserWithTags>(USER_ID, UserWithTags);
        session.advanced.patch(user, "name", "Updated");

        const command = deferred(session).deferredCommandsMap.get(IdTypeAndName.keyFor(USER_ID, "JsonPatch", null)) as JsonPatchCommandData;
        assert.strictEqual(command.changeVector, null);

        // concurrent write from another session must not make the patch fail
        const other = store.openSession();
        const otherUser = await other.load<UserWithTags>(USER_ID, UserWithTags);
        otherUser.age = 99;
        await other.saveChanges();

        await session.saveChanges();

        const reloaded = await loadUser(store);
        assert.strictEqual(reloaded.name, "Updated");
        assert.strictEqual(reloaded.age, 99);
    });

    for (const [behavior, expectedType] of behaviors) {
        it(`patchArray() push uses ${expectedType} under ${behavior}`, async () => {
            const target = await storeWithBehavior(behavior);
            try {
                await storeUser(target);

                const session = target.openSession();
                session.advanced.patchArray(USER_ID, "tags", tags => tags.push("d"));
                assert.strictEqual(hasDeferred(session, expectedType), true);
                await session.saveChanges();

                const user = await loadUser(target);
                assert.deepStrictEqual(user.tags, ["a", "b", "c", "d"]);
            } finally {
                await disposeTestDocumentStore(target);
            }
        });

        it(`patchArray() removeAt uses ${expectedType} under ${behavior}`, async () => {
            const target = await storeWithBehavior(behavior);
            try {
                await storeUser(target);

                const session = target.openSession();
                session.advanced.patchArray(USER_ID, "tags", tags => tags.removeAt(1));
                assert.strictEqual(hasDeferred(session, expectedType), true);
                await session.saveChanges();

                const user = await loadUser(target);
                assert.deepStrictEqual(user.tags, ["a", "c"]);
            } finally {
                await disposeTestDocumentStore(target);
            }
        });
    }

    it("patchArray() with several pushes and a removeAt becomes one JsonPatch", async () => {
        await storeUser(store);

        const session = store.openSession();
        session.advanced.patchArray(USER_ID, "tags", tags => tags.push("d", "e").removeAt(0));
        session.advanced.patch(USER_ID, "name", "Updated");
        assert.strictEqual(hasDeferred(session, "JsonPatch"), true);
        assert.strictEqual(deferred(session).deferredCommandsCount, 1);
        await session.saveChanges();

        const user = await loadUser(store);
        assert.deepStrictEqual(user.tags, ["b", "c", "d", "e"]);
        assert.strictEqual(user.name, "Updated");
    });

    it("patchArray() falls back to JavaScript when a pushed value is an object", async () => {
        await storeUser(store, { tags: [] });

        const session = store.openSession();
        session.advanced.patchArray<UserWithTags, any>(USER_ID, "tags", tags => tags.push({ nested: true }));
        assert.strictEqual(hasDeferred(session, "PATCH"), true);
        assert.strictEqual(hasDeferred(session, "JsonPatch"), false);
        await session.saveChanges();

        const user = await loadUser(store);
        assert.deepStrictEqual(user.tags, [{ nested: true }] as any);
    });

    it("patchArray() removeAt out of range throws under JsonPatch and is a no-op under JavaScript", async () => {
        await storeUser(store);
        {
            const session = store.openSession();
            session.advanced.patchArray(USER_ID, "tags", tags => tags.removeAt(10));
            // assertThrows() without an error callback swallows its own failure, so always assert on the error
            await assertThrows(() => session.saveChanges(), err => {
                assertThat(err.message).contains("out of array bounds");
            });
        }

        const legacy = await storeWithBehavior("JavaScript");
        try {
            await storeUser(legacy);
            const session = legacy.openSession();
            session.advanced.patchArray(USER_ID, "tags", tags => tags.removeAt(10));
            await session.saveChanges(); // splice(10, 1) is a silent no-op

            const user = await loadUser(legacy);
            assert.deepStrictEqual(user.tags, ["a", "b", "c"]);
        } finally {
            await disposeTestDocumentStore(legacy);
        }
    });

    it("patchArray() removeAt with a negative index falls back to JavaScript", async () => {
        await storeUser(store);

        const session = store.openSession();
        session.advanced.patchArray(USER_ID, "tags", tags => tags.removeAt(-1));
        assert.strictEqual(hasDeferred(session, "PATCH"), true);
        assert.strictEqual(hasDeferred(session, "JsonPatch"), false);
        await session.saveChanges(); // splice(-1, 1) removes the last element, as before

        const user = await loadUser(store);
        assert.deepStrictEqual(user.tags, ["a", "b"]);
    });

    it("patchArray() and patchObject() with no recorded operations stay on JavaScript", async () => {
        await storeUser(store);

        const session = store.openSession();
        session.advanced.patchArray(USER_ID, "tags", () => { /* nothing recorded */ });
        session.advanced.patchObject(USER_ID, "settings", () => { /* nothing recorded */ });
        assert.strictEqual(hasDeferred(session, "PATCH"), true);
        assert.strictEqual(hasDeferred(session, "JsonPatch"), false);
        await session.saveChanges(); // empty scripts were a no-op before this change and still are

        const user = await loadUser(store);
        assert.deepStrictEqual(user.tags, ["a", "b", "c"]);
        assert.deepStrictEqual(user.settings, { theme: "light" });
    });

    for (const [behavior, expectedType] of behaviors) {
        it(`patchObject() set uses ${expectedType} under ${behavior}`, async () => {
            const target = await storeWithBehavior(behavior);
            try {
                await storeUser(target);

                const session = target.openSession();
                session.advanced.patchObject(USER_ID, "settings", map => map.set("lang", "en"));
                assert.strictEqual(hasDeferred(session, expectedType), true);
                await session.saveChanges();

                const user = await loadUser(target);
                assert.deepStrictEqual(user.settings, { theme: "light", lang: "en" });
            } finally {
                await disposeTestDocumentStore(target);
            }
        });

        it(`patchObject() remove uses ${expectedType} under ${behavior}`, async () => {
            const target = await storeWithBehavior(behavior);
            try {
                await storeUser(target, { settings: { theme: "light", lang: "en" } });

                const session = target.openSession();
                session.advanced.patchObject(USER_ID, "settings", map => map.remove("lang"));
                assert.strictEqual(hasDeferred(session, expectedType), true);
                await session.saveChanges();

                const user = await loadUser(target);
                assert.deepStrictEqual(user.settings, { theme: "light" });
            } finally {
                await disposeTestDocumentStore(target);
            }
        });
    }

    it("patchObject() escapes keys containing / and ~", async () => {
        await storeUser(store);

        const session = store.openSession();
        session.advanced.patchObject(USER_ID, "settings", map => map.set("a/b", "slash").set("c~d", "tilde"));
        assert.strictEqual(hasDeferred(session, "JsonPatch"), true);
        await session.saveChanges();

        const user = await loadUser(store);
        assert.deepStrictEqual(user.settings, { theme: "light", "a/b": "slash", "c~d": "tilde" });
    });

    it("patchObject() falls back to JavaScript for object values and whitespace keys", async () => {
        await storeUser(store);

        const session = store.openSession();
        session.advanced.patchObject<UserWithTags, string, any>(USER_ID, "settings", map => map.set("nested", { deep: true }));
        assert.strictEqual(hasDeferred(session, "PATCH"), true);
        assert.strictEqual(hasDeferred(session, "JsonPatch"), false);
        await session.saveChanges();

        const user = await loadUser(store);
        assert.deepStrictEqual((user.settings as any).nested, { deep: true });

        // a whitespace-only key cannot be a JSON pointer segment, so the whole map call stays JavaScript
        const whitespace = store.openSession();
        whitespace.advanced.patchObject(USER_ID, "settings", map => map.set("   ", "x").set("with.dot", "y"));
        assert.strictEqual(hasDeferred(whitespace, "PATCH"), true);
        assert.strictEqual(hasDeferred(whitespace, "JsonPatch"), false);
        await whitespace.saveChanges(); // bracket notation keeps the JavaScript fallback valid for any key

        const afterWhitespace = await loadUser(store);
        assert.strictEqual(afterWhitespace.settings["   "], "x");
        assert.strictEqual(afterWhitespace.settings["with.dot"], "y");
    });

    it("patchObject() remove of a missing key throws under JsonPatch and is a no-op under JavaScript", async () => {
        await storeUser(store);
        {
            const session = store.openSession();
            session.advanced.patchObject(USER_ID, "settings", map => map.remove("missing"));
            // assertThrows() without an error callback swallows its own failure, so always assert on the error
            await assertThrows(() => session.saveChanges(), err => {
                assertThat(err.message).contains("missing");
            });
        }

        const legacy = await storeWithBehavior("JavaScript");
        try {
            await storeUser(legacy);
            const session = legacy.openSession();
            session.advanced.patchObject(USER_ID, "settings", map => map.remove("missing"));
            await session.saveChanges(); // delete obj.missing is a silent no-op

            const user = await loadUser(legacy);
            assert.deepStrictEqual(user.settings, { theme: "light" });
        } finally {
            await disposeTestDocumentStore(legacy);
        }
    });
});
